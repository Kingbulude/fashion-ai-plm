import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/supabase";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return NextResponse.next();
  }
  
  const session = await getSession(request);
  
  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
