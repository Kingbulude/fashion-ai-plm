import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// 关键判断：env vars 是否完整配置
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const isServiceRoleConfigured = Boolean(supabaseServiceRoleKey);

// 创建一个安全的 Mock 客户端，避免在无 env 时出现 fetch 失败 / 白屏
// 该客户端的 .from().select() 等查询会立即返回空数据，不发起任何网络请求
function createMockClient(): SupabaseClient {
  const mockResult = (table: string) => {
    const builder: any = {
      select: () => builder,
      insert: () => builder,
      update: () => builder,
      upsert: () => builder,
      delete: () => builder,
      eq: () => builder,
      neq: () => builder,
      in: () => builder,
      not: () => builder,
      is: () => builder,
      lt: () => builder,
      gt: () => builder,
      lte: () => builder,
      gte: () => builder,
      or: () => builder,
      order: () => builder,
      limit: () => builder,
      range: () => builder,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: any) => resolve({ data: [], error: null }),
    };
    return builder;
  };

  const mockAuth: any = {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithPassword: () =>
      Promise.resolve({ data: { user: null, session: null }, error: { message: "Supabase 未配置" } }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  };

  return {
    from: (table: string) => mockResult(table),
    auth: mockAuth,
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        download: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
  } as unknown as SupabaseClient;
}

function createSupabaseClient(key: string): SupabaseClient {
  if (!isSupabaseConfigured) {
    return createMockClient();
  }
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// 匿名客户端（受 RLS 约束）
// 仅用于：
// 1. 真正公开可读的数据查询
// 2. 向后兼容尚未迁移到 per-request client 的代码
// 业务 API 应当优先使用 createServerSupabaseClient(request) 获取绑定用户会话的客户端
let _anonClient: SupabaseClient | null = null;
function getAnonClient(): SupabaseClient {
  if (!_anonClient) {
    _anonClient = createSupabaseClient(supabaseAnonKey);
  }
  return _anonClient;
}

// 管理员客户端（使用 service role key，绕过 RLS）
// 仅用于：
// 1. migration / seed
// 2. 无用户上下文的后台任务（如 cron、pipeline）
// 3. 初始化默认数据
// 严禁在普通业务 API 请求中使用
let _serviceRoleClient: SupabaseClient | null = null;
export function getServiceRoleClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    return createMockClient();
  }
  if (!isServiceRoleConfigured) {
    // 未配置 service role 时，明确降级到 anon client 而不是伪造 service role
    // 这样 RLS 仍然生效，避免意外开放数据
    console.warn(
      "[getServiceRoleClient] SUPABASE_SERVICE_ROLE_KEY 未配置，已降级到 anon client。"
    );
    return getAnonClient();
  }
  if (!_serviceRoleClient) {
    _serviceRoleClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _serviceRoleClient;
}

// 从请求中创建绑定用户会话的 Supabase 客户端（RLS 生效）
// 这是业务 API 的首选客户端
export function createServerSupabaseClient(
  request: Request | NextRequest
): SupabaseClient {
  if (!isSupabaseConfigured) {
    return createMockClient();
  }

  const nextRequest = request as NextRequest;
  const cookies =
    typeof nextRequest.cookies?.getAll === "function"
      ? nextRequest.cookies.getAll()
      : [];

  // 也支持 Authorization: Bearer <token> 的 API 调用
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : undefined;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    cookies: {
      getAll() {
        return cookies;
      },
      setAll() {
        // API route 只读 session，不需要写回 cookie
      },
    },
    global: {
      headers: bearerToken
        ? {
            Authorization: `Bearer ${bearerToken}`,
          }
        : undefined,
    },
  });
}

// 向后兼容的全局 supabase 实例（anon client）
// 注意：该实例不携带具体用户会话，受 RLS 限制，不能读取用户私有数据
// 业务 API 应当从请求创建 createServerSupabaseClient(request)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getAnonClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop as string];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

// 管理员客户端（service role）
// 与 supabase 解耦，明确区分用途，避免普通请求意外绕过 RLS
export const dbAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getServiceRoleClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop as string];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});
