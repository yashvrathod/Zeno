import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Middleware runs on the Edge runtime.
// IMPORTANT: Do NOT import Prisma/DB code here.
export default async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Not signed in
  if (!token) {
    // For API routes, return 401 JSON (so fetch() callers don't get HTML redirects)
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For pages, redirect to login
    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(url, 307);
  }

  return NextResponse.next();
}

// Protect these routes - require authentication
export const config = {
  // Only protect endpoints that must be authenticated.
  // Keep the app browsable as a guest (including /profile UI).
  matcher: [
    "/api/execute",
    "/api/submissions/:path*",
    "/dashboard/:path*",
    "/problems/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/leaderboard/:path*",
    "/challenge",
    "/mentor",
    "/topics/:path*",
    "/patterns",
    "/roadmap/:path*",
    "/community",
  ],
};
