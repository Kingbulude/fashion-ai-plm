import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return { url, key, valid: !!(url && key && !url.includes("placeholder")) };
}

// 安全的 Mock 客户端 - 不发任何网络请求
function createMockClient(): SupabaseClient {
  const chain: any = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    upsert: () => chain,
    delete: () => chain,
    eq: () => chain,
    neq: () => chain,
    in: () => chain,
    not: () => chain,
    is: () => chain,
    lt: () => chain,
    gt: () => chain,
    lte: () => chain,
    gte: () => chain,
    or: () => chain,
    order: () => chain,
    limit: () => chain,
    range: () => chain,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: any) => resolve({ data: [], error: null }),
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
    auth: mockAuth,
    from: () => chain,
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        download: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
  } as unknown as SupabaseClient;
}

function createSupabaseClient(): SupabaseClient {
  const { url, key, valid } = getSupabaseConfig();

  if (!valid) {
    // 未配置 → 返回 Mock 客户端（避免白屏/CPU 死锁）
    return createMockClient();
  }

  // 浏览器端使用 @supabase/ssr 的 createBrowserClient，自动把 session 同步到 cookie
  // 这样后端 API 才能从 request cookie 中读取登录态
  if (typeof window !== "undefined") {
    return createBrowserClient(url, key) as unknown as SupabaseClient;
  }

  return createClient(url, key, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_supabase) {
    _supabase = createSupabaseClient();
  }
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop as string];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

export async function getSession(request: Request | NextRequest): Promise<{ user: User } | null> {
  const { url: supabaseUrl, key: supabaseKey, valid } = getSupabaseConfig();

  if (!valid) {
    return null;
  }

  // 1. 优先从 Authorization header 读取（API/脚本调用场景）
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    try {
      const supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      });
      const { data, error } = await supabaseClient.auth.getUser(token);
      if (!error && data?.user) {
        return { user: data.user };
      }
    } catch (e) {
      console.error("Bearer auth error:", e);
    }
  }

  // 2. 使用 @supabase/ssr createServerClient 从 cookie 读取 session
  // 这是配合 createBrowserClient 的彻底方案，能正确解析 base64url 编码的 cookie
  try {
    const nextRequest = request as NextRequest;
    if (typeof nextRequest.cookies?.getAll === "function") {
      const supabaseServer = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return nextRequest.cookies.getAll();
          },
          setAll() {
            // API route 只读 session，不需要写回 cookie
          },
        },
      });

      const { data, error } = await supabaseServer.auth.getUser();
      if (!error && data?.user) {
        return { user: data.user };
      }
    }
  } catch (e) {
    console.error("Server client auth error:", e);
  }

  return null;
}

export async function requireAuth(request: NextRequest) {
  const session = await getSession(request);

  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
