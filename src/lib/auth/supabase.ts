import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// ─── 环境变量 ───
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function isValidConfig(): boolean {
  return !!(supabaseUrl && !supabaseUrl.includes("placeholder"));
}

// ─── Auth 客户端（单例，仅用于 session 验证） ───
let _authClient: SupabaseClient | null = null;

function getAuthClient(): SupabaseClient {
  if (_authClient) return _authClient;

  if (!isValidConfig()) {
    return createClient("https://placeholder.supabase.co", "placeholder-key", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  _authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return _authClient;
}

// ─── 兼容别名：前端页面（login 等）仍在用的 supabase 客户端 ───
// 使用 persistSession: true 以支持浏览器端的登录态持久化
function createBrowserClient(): SupabaseClient {
  if (!isValidConfig()) {
    return createClient("https://placeholder.supabase.co", "placeholder-key", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      autoRefreshToken: true,
    },
  });
}

let _browserClient: SupabaseClient | null = null;

// 向后兼容：app/login/page.tsx 和 sidebar-layout 仍导入 { supabase }
// ⚠️ 此别名仅用于前端登录/会话恢复，数据查询请用 @/lib/db/client 的 dbAdmin
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_browserClient) {
      _browserClient = createBrowserClient();
    }
    const value = (
      _browserClient as unknown as Record<string | symbol, unknown>
    )[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(_browserClient)
      : value;
  },
});

// ─── 从请求中提取 token（支持 Authorization header 和 cookie 两种方式） ───
function extractToken(request: Request | NextRequest): string | null {
  // 1. Authorization header（前端 fetch 显式带上）
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "");
  }

  // 2. cookie（SSR 场景或浏览器自动携带）
  const cookieHeader = request.headers.get("cookie") || "";
  if (!cookieHeader) return null;

  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...valueParts] = cookie.trim().split("=");
    if (name) {
      cookies[name] = decodeURIComponent(valueParts.join("=") || "");
    }
  });

  // 2.1 sb-access-token 格式
  if (cookies["sb-access-token"]) {
    return cookies["sb-access-token"];
  }

  // 2.2 sb-xxx-auth-token 格式（Supabase 默认，value 是 JSON）
  for (const [name, value] of Object.entries(cookies)) {
    if (name.endsWith("-auth-token")) {
      try {
        const authData = JSON.parse(value);
        if (authData.access_token) {
          return authData.access_token;
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  return null;
}

// ─── getSession：从请求中提取用户 session ───
// 返回 { user, accessToken } —— accessToken 供 createDbUser() 使用
export async function getSession(request: Request | NextRequest) {
  if (!isValidConfig()) return null;

  const token = extractToken(request);
  if (!token) return null;

  const client = getAuthClient();

  try {
    const { data, error } = await client.auth.getUser(token);

    if (error || !data.user) {
      console.error("[auth] getUser error:", error?.message);
      return null;
    }

    return { user: data.user, accessToken: token };
  } catch (err) {
    console.error("[auth] session validation error:", err);
    return null;
  }
}

// ─── requireAuth：页面级认证守卫 ───
// 用在 middleware.ts 中，未登录则重定向到 /login
export async function requireAuth(request: NextRequest) {
  const session = await getSession(request);

  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
