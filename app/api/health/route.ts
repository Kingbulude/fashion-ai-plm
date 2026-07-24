import { supabase } from "@/lib/db/client";

export const runtime = "edge";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  // 测试数据库连接与权限（使用服务端 Supabase 客户端）
  let dbTest: any = { status: "pending" };
  try {
    const { data, error } = await supabase.from("process_links").select("id").limit(1);
    dbTest = {
      status: error ? "error" : "ok",
      dataSample: data ? "received" : "none",
      error: error ? { message: error.message, code: error.code, hint: error.hint } : null,
    };
  } catch (e: any) {
    dbTest = { status: "exception", message: e?.message || String(e) };
  }

  return new Response(JSON.stringify({
    status: "ok",
    env: {
      NEXT_PUBLIC_SUPABASE_URL: !!url && !url.includes("placeholder"),
      NEXT_PUBLIC_SUPABASE_URL_LENGTH: url.length,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!anonKey && anonKey.length > 0,
      NEXT_PUBLIC_SUPABASE_ANON_KEY_LENGTH: anonKey.length,
      SUPABASE_SERVICE_ROLE_KEY: !!serviceKey && serviceKey.length > 0,
      SUPABASE_SERVICE_ROLE_KEY_LENGTH: serviceKey.length,
      SUPABASE_SERVICE_ROLE_KEY_PREFIX: serviceKey ? serviceKey.slice(0, 8) : null,
      CLOUDFLARE_ACCOUNT_ID: !!process.env.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_AI_TOKEN: !!process.env.CLOUDFLARE_AI_TOKEN,
    },
    dbTest,
  }), {
    headers: { "Content-Type": "application/json" },
  });
}
