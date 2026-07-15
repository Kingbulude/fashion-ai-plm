import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
});

export async function getSession(request: NextRequest) {
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      detectSessionInUrl: false,
    },
  });
  
  const { data, error } = await supabaseClient.auth.getSession();
  
  if (error) {
    console.error("Auth error:", error);
    return null;
  }
  
  return data.session;
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
