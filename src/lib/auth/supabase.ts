import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
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

export function getServerSupabase(request: Request | NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        get: (key: string) => {
          const cookieHeader = request.headers.get("cookie") || "";
          const cookies: Record<string, string> = {};
          cookieHeader.split(";").forEach(cookie => {
            const [name, value] = cookie.trim().split("=");
            cookies[name] = decodeURIComponent(value || "");
          });
          return cookies[key] || null;
        },
      },
    }
  );
}

export async function getSession(request: Request | NextRequest) {
  try {
    const supabaseServerClient = getServerSupabase(request);
    const { data, error } = await supabaseServerClient.auth.getUser();
    if (!error && data?.user) {
      return { user: data.user };
    }
  } catch (e) {
    console.error("Server auth error:", e);
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    try {
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data, error } = await supabaseClient.auth.getUser(token);
      if (!error && data?.user) {
        return { user: data.user };
      }
    } catch (e) {
      console.error("Bearer auth error:", e);
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
