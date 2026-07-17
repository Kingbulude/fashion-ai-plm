import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return { url, key, valid: !!(url && key && !url.includes("placeholder")) };
}

function createSupabaseClient(): SupabaseClient {
  const { url, key, valid } = getSupabaseConfig();

  if (!valid) {
    // 构建阶段允许使用占位符；运行时再校验
    return createClient("https://placeholder.supabase.co", "placeholder-key", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return createClient(url, key, {
    auth: {
      persistSession: true,
      detectSessionInUrl: false,
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

function ensureRuntimeConfig() {
  const { valid } = getSupabaseConfig();
  if (!valid) {
    throw new Error("Supabase 环境变量未配置：NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
}

export async function getSession(request: NextRequest) {
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    await supabaseClient.auth.setSession({ access_token: token, refresh_token: "" });
  }

  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    console.error("Auth error:", error);
    return null;
  }

  return { user: data.user };
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
