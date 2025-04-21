import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // List of public paths that don't require authentication
  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/about',
    '/contact',
    '/api/auth/signin',
    '/api/auth/signout',
    '/api/auth/session',
    '/api/auth/csrf',
  ];

  // Check if the current path is a public path
  const isPublicPath = publicPaths.some(publicPath => 
    path === publicPath || 
    path.startsWith('/api/auth/') ||
    path.includes('_next') || 
    path.includes('/static/')
  );

  // Get the token, if it exists
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect to login if accessing a protected route without being authenticated
  if (!token && !isPublicPath) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }

  // Special protected routes that require specific roles

  // Admin route protection
  if (path.startsWith('/admin')) {
    const isAdmin = token?.role === 'ADMIN' || token?.isAdmin === true;
    if (!isAdmin) {
      // User is authenticated but not an admin, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Clerk route protection
  if (path.startsWith('/clerk')) {
    const isClerkOrAdmin = 
      token?.role === 'CLERK' || 
      token?.role === 'ADMIN' || 
      token?.isClerk === true || 
      token?.isAdmin === true;

    if (!isClerkOrAdmin) {
      // User is authenticated but not a clerk or admin, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Affiliate page protection
  if (path.startsWith('/affiliate') && path !== '/affiliate/join') {
    const isAffiliate = token?.isAffiliate === true;
    if (!isAffiliate) {
      // User is authenticated but not an affiliate, redirect to join page
      return NextResponse.redirect(new URL('/affiliate/join', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except for static assets and API routes that don't need protection
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

