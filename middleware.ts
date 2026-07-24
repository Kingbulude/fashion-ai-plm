import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel, RouteProcessNodeMap } from "@/lib/auth/rbac";

// 管理后台路由：仅允许 BOSS/ADMIN
const ADMIN_ROUTE_PREFIXES = ["/admin", "/brands"];

// 需要品牌管理员权限的路由
const MANAGER_ROUTE_PREFIXES = ["/suppliers"];

// 公开路由
const PUBLIC_ROUTES = ["/login", "/register", "/api", "/_next", "/favicon.ico"];

interface AuthMePayload {
  roleLevel?: string;
  accessibleRoutes?: string[];
  accessibleProcessNodes?: string[];
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路由和静态资源直接放行
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const session = await getSession(request);

  if (!session?.user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 调用 /api/auth/me 获取当前用户权限（复用已登录会话）
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
    // 拦截所有页面路由，排除公开页面、API、静态资源
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|login|register|reset-password|forbidden|health).*)",
  ],
};
