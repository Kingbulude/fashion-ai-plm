import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel, RouteProcessNodeMap } from "@/lib/auth/rbac";

// 管理后台路由：仅允许 BOSS/ADMIN
const ADMIN_ROUTE_PREFIXES = ["/admin", "/brands"];

// 需要品牌管理员权限的路由
const MANAGER_ROUTE_PREFIXES = ["/suppliers"];

// 公开页面路由（无需登录即可访问）
const PUBLIC_PAGE_ROUTES = ["/login", "/register", "/reset-password", "/forbidden"];

// 公开 API 白名单（无需 session 即可访问）
const PUBLIC_API_ROUTES = ["/api/health", "/api/auth"];

interface AuthMePayload {
  roleLevel?: string;
  accessibleRoutes?: string[];
  accessibleProcessNodes?: string[];
}

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isStaticResource(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/assets/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静态资源直接放行
  if (isStaticResource(pathname)) {
    return NextResponse.next();
  }

  // 公开 API 白名单直接放行
  if (pathname.startsWith("/api/") && isPublicApi(pathname)) {
    return NextResponse.next();
  }

  // 公开页面直接放行
  if (isPublicPage(pathname)) {
    return NextResponse.next();
  }

  // 统一获取服务端会话（从 cookie 或 Authorization header）
  const session = await getSession(request);

  // API 路由：无 session 直接返回 401（避免重定向到登录页污染 API 调用）
  if (pathname.startsWith("/api/")) {
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // API 路由在 middleware 层只做 session 校验，更细粒度的权限由各自 route 负责
    return NextResponse.next();
  }

  // 页面路由：无 session 重定向到登录页
  if (!session?.user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 以下页面路由权限检查需要 /api/auth/me 配合，但 /api/auth/me 本身在白名单中不会递归
  const origin = request.nextUrl.origin;
  let authMe: AuthMePayload = {};
  try {
    const res = await fetch(`${origin}/api/auth/me`, {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });
    if (res.ok) {
      authMe = await res.json();
    }
  } catch (error) {
    console.error("[middleware] failed to fetch auth me:", error);
  }

  const roleLevel = authMe.roleLevel;
  const accessibleRoutes = authMe.accessibleRoutes || [];
  const accessibleProcessNodes = authMe.accessibleProcessNodes || [];
  const isBossOrAdmin = roleLevel === RoleLevel.BOSS || roleLevel === RoleLevel.ADMIN;
  const isManagerOrAbove = isBossOrAdmin || roleLevel === RoleLevel.BRAND_MANAGER;

  // 1. 管理后台拦截
  if (ADMIN_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    if (!isBossOrAdmin) {
      return NextResponse.redirect(new URL("/dashboard?error=forbidden", request.url));
    }
    return NextResponse.next();
  }

  // 2. 品牌管理员路由拦截
  if (MANAGER_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    if (!isManagerOrAbove) {
      return NextResponse.redirect(new URL("/dashboard?error=forbidden", request.url));
    }
    return NextResponse.next();
  }

  // 3. 工序页面拦截
  const matchedProcessRoute = Object.keys(RouteProcessNodeMap)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (matchedProcessRoute && roleLevel) {
    const requiredNode = RouteProcessNodeMap[matchedProcessRoute];
    const hasAllNodes = accessibleProcessNodes.includes("*");
    const hasNode = accessibleProcessNodes.includes(requiredNode);

    if (!hasAllNodes && !hasNode) {
      // 额外兜底：如果横向工序角色的 route_permissions 明确包含该路由，也允许访问
      const routeAllowed = accessibleRoutes.includes("*") || accessibleRoutes.includes(matchedProcessRoute);
      if (!routeAllowed) {
        return NextResponse.redirect(new URL("/dashboard?error=forbidden", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 拦截所有路径，仅排除静态资源
    "/((?!_next/static|_next/image|_next/data|favicon.ico|fonts|images|assets).*)",
  ],
};
