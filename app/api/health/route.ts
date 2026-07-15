export const runtime = "edge";

export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasCfAccountId = !!process.env.CLOUDFLARE_ACCOUNT_ID;
  const hasCfAiToken = !!process.env.CLOUDFLARE_AI_TOKEN;

  return new Response(JSON.stringify({
    status: "ok",
    env: {
      NEXT_PUBLIC_SUPABASE_URL: hasUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: hasAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: hasServiceKey,
      CLOUDFLARE_ACCOUNT_ID: hasCfAccountId,
      CLOUDFLARE_AI_TOKEN: hasCfAiToken,
    },
  }), {
    headers: { "Content-Type": "application/json" },
  });
}
