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

export async function getSession(request: Request | NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  // 1. 从 Authorization header 读取
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

  // 2. 从 cookie 读取
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach(cookie => {
    const [name, ...valueParts] = cookie.trim().split("=");
    if (name) {
      cookies[name] = decodeURIComponent(valueParts.join("=") || "");
    }
  });

  // 2.1 尝试 sb-access-token
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

  // 2.2 尝试 sb-xxx-auth-token 格式（Supabase 默认）
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
        // ignore parse errors
      }
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
