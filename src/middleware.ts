import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/supabase";

// ─── 公开路由白名单（无需认证） ───
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/health",
  "/api/auth",
  // Next.js 内部
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
];

// ─── AI 内部调用密钥 ───
// AI Pipeline / Skill / Cron 调用 API 时使用此密钥，不走用户 session
// 在 .env.local 中配置: AI_API_KEY=your-secret-key
const AI_API_KEY = process.env.AI_API_KEY || "";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路由直接放行
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // API 路由认证
  if (pathname.startsWith("/api")) {
    // 优先检查 AI 内部调用密钥
    const aiKey = request.headers.get("x-ai-key");
    if (aiKey && AI_API_KEY && aiKey === AI_API_KEY) {
      // AI 内部调用通过，在 header 中标记来源
      const response = NextResponse.next();
      response.headers.set("x-request-source", "ai-system");
      return response;
    }

    // 用户认证
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", message: "请先登录" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 页面路由认证
  const session = await getSession(request);
  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // 匹配所有路径（除了 _next/static、_next/image、favicon.ico）
  // API 路由不再被排除，统一经过认证检查
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
