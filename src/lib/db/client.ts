import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ─── 环境变量 ───
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function isValidConfig(): boolean {
  return !!(supabaseUrl && !supabaseUrl.includes("placeholder"));
}

// ─── 占位客户端（构建阶段用，运行时不可用） ───
const PLACEHOLDER_CLIENT = createClient(
  "https://placeholder.supabase.co",
  "placeholder-key",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── dbAdmin：Service-role 客户端 ───
// 用途：AI 内部操作、后台任务、需要绕过 RLS 的场景
// 警告：此客户端有上帝权限，禁止在用户请求路由中使用
let _dbAdmin: SupabaseClient | null = null;

function getDbAdmin(): SupabaseClient {
  if (_dbAdmin) return _dbAdmin;

  if (!isValidConfig()) {
    console.warn("[dbAdmin] Supabase 未配置，使用占位客户端");
    return PLACEHOLDER_CLIENT;
  }

  const key = supabaseServiceRoleKey || supabaseAnonKey;
  if (supabaseServiceRoleKey) {
    console.warn("[dbAdmin] 使用 SERVICE_ROLE_KEY，请确保仅在可信环境中使用");
  }

  _dbAdmin = createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _dbAdmin;
}

// ─── createDbUser：Per-request 用户级客户端 ───
// 用途：用户请求路由中，基于用户 session 创建 scoped 客户端
// 此客户端受 RLS 约束，保证行级数据隔离
export function createDbUser(accessToken: string): SupabaseClient {
  if (!isValidConfig()) {
    throw new Error("[dbUser] Supabase 环境变量未配置：NEXT_PUBLIC_SUPABASE_URL");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

// ─── Lazy Proxy ───
function createLazyProxy(getClient: () => SupabaseClient): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_target, prop) {
      const client = getClient();
      const value = (client as unknown as Record<string | symbol, unknown>)[
        prop as string
      ];
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(client)
        : value;
    },
  });
}

// ─── 导出 ───
// dbAdmin: 仅用于 AI Pipeline / Skill / 后台任务
export const dbAdmin = createLazyProxy(getDbAdmin);

// 向后兼容别名（后续逐步迁移到 dbAdmin）
// ⚠️ 这些别名将在 Phase 2 后标记 deprecated 并逐步移除
export const supabase = dbAdmin;
export const db = dbAdmin;
