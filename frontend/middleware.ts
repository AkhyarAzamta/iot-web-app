import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const path = req.nextUrl.pathname;
  
  // Skip API routes and server actions
  if (path.startsWith("/api") || path.includes("/actions/")) {
    return NextResponse.next();
  }
  
  if (!token && (path.startsWith("/dashboard") || path.startsWith("/profile"))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};