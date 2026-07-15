import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;

  if (!supabaseUrl || !supabaseAnonKey) {
    // 构建阶段或环境变量未配置时，使用占位符避免构建失败
    if (process.env.NODE_ENV === "production" && typeof window === "undefined") {
      // 在生产环境构建时返回 mock，运行时如未配置会报错
      return createClient("https://placeholder.supabase.co", "placeholder-key", {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    return createClient("https://placeholder.supabase.co", "placeholder-key", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
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
