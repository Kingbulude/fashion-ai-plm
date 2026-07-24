import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// 关键判断：env vars 是否完整配置
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

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

let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;

  // 未配置 → 直接返回 Mock 客户端（不发任何网络请求，避免白屏/死锁）
  if (!isSupabaseConfigured) {
    _supabase = createMockClient();
    return _supabase;
  }

  const key = supabaseServiceRoleKey || supabaseAnonKey;
  _supabase = createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop as string];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

export const db = supabase;
