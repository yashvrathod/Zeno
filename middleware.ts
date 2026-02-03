import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Custom middleware logic here if needed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Protect these routes - require authentication
export const config = {
  matcher: [
    '/profile/:path*',
    '/problems/:path*/submit',
    '/leaderboard/:path*',
  ],
};
