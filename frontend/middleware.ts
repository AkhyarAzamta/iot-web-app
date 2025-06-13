// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value

  // Kalau belum ada token, redirect ke /login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Kalau ada token, lanjut ke route asalnya
  return NextResponse.next()
}

export const config = {
  // Terapkan middleware ke semua path di /dashboard dan sub-path
  matcher: ['/dashboard/:path*'],
}
