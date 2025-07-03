import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Remove excessive logging in production
  if (process.env.NODE_ENV === 'development') {
    console.log("Middleware checking path:", path);
  }

  // List of public paths that don't require authentication
  const publicPaths = [
    '/login',
    '/register',
    '/about',
    '/contact',
    '/api/auth/signin',
    '/api/auth/signout',
    '/api/auth/session',
    '/api/auth/csrf',
    '/api/auth/callback/credentials',
    '/api/auth/providers',
    '/admin-auth/login',
    '/admin-auth/register',
    '/clerk-auth/login',
    '/clerk-auth/register'
  ];

  // Optimize path checking with early returns
  const isPublicPath = publicPaths.includes(path) || 
    path.startsWith('/api/auth/') ||
    path.includes('/_next/') || 
    path.includes('/static/') || 
    path.includes('/assets/') ||
    path.includes('/images/') ||
    path.endsWith('.ico') ||
    path.endsWith('.png') ||
    path.endsWith('.jpg') ||
    path.endsWith('.svg');

  const isHomepage = path === '/';

  // Get token with optimized settings
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Reduce logging
  if (process.env.NODE_ENV === 'development' && token) {
    console.log("Token found for:", path, "Role:", token.role);
  }

  // Homepage redirects
  if (isHomepage && token) {
    if (token.isAdmin) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    } else if (token.isClerk) {
      return NextResponse.redirect(new URL('/clerk/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Public paths handling
  if (isPublicPath || isHomepage) {
    if (token) {
      if ((path === '/admin-auth/login' || path === '/admin-auth/register') && token.isAdmin) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      
      if ((path === '/clerk-auth/login' || path === '/clerk-auth/register') && 
          (token.isClerk || token.isAdmin)) {
        return NextResponse.redirect(new URL('/clerk/dashboard', request.url));
      }
      
      if (path === '/login' || path === '/register') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    
    return NextResponse.next();
  }

  // Protected routes - redirect to login if not authenticated
  if (!token) {
    let loginPath = '/login';
    
    if (path.startsWith('/admin')) {
      loginPath = '/admin-auth/login';
    } else if (path.startsWith('/clerk')) {
      loginPath = '/clerk-auth/login';
    }
    
    const url = new URL(loginPath, request.url);
    url.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(url);
  }

  // Role-based access control
  if (path.startsWith('/admin') && !token.isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (path.startsWith('/clerk') && !token.isClerk && !token.isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 🔥 REMOVE EXPENSIVE API CALL - Handle affiliate check client-side instead
  if (path.startsWith('/affiliate') && path !== '/affiliate/join') {
    // Just check token affiliate status instead of API call
    if (!token.isAffiliate) {
      return NextResponse.redirect(new URL('/affiliate/join', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/(?!auth).*|_next/static|_next/image|favicon.ico).*)',
  ],
};