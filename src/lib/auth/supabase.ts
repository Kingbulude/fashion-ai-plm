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

function ensureRuntimeConfig() {
  const { valid } = getSupabaseConfig();
  if (!valid) {
    throw new Error("Supabase 环境变量未配置：NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
}

export async function getSession(request: Request | NextRequest) {
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key",
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
    try {
      const { data, error } = await supabaseClient.auth.getUser(token);
      if (!error && data?.user) {
        return { user: data.user };
      }
    } catch (e) {
      console.error("Bearer auth error:", e);
    }
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const cookiePairs = cookieHeader.split(";").filter(Boolean).map(c => {
    const [k, ...v] = c.trim().split("=");
    return [k, decodeURIComponent(v.join("="))] as const;
  });
  const cookies: Record<string, string> = Object.fromEntries(cookiePairs);

  for (const [name, value] of Object.entries(cookies)) {
    if (name.endsWith("-auth-token")) {
      try {
        const authData = JSON.parse(value);
        if (authData.access_token) {
          const { data, error } = await supabaseClient.auth.getUser(authData.access_token);
          if (!error && data?.user) {
            return { user: data.user };
          }
        }
      } catch (e) {
        console.error("Auth token cookie error:", e);
      }
    }
  }

  if (cookies["sb-access-token"]) {
    try {
      const { data, error } = await supabaseClient.auth.getUser(cookies["sb-access-token"]);
      if (!error && data?.user) {
        return { user: data.user };
      }
    } catch (e) {
      console.error("Access token auth error:", e);
    }
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
