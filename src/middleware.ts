import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { PrismaClient } from '@prisma/client';

// Create a global prisma instance for middleware
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Debug for development
  console.log("Middleware checking path:", path);

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

  // Check if the current path is a public path
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

  // Special handling for homepage
  const isHomepage = path === '/';

  // Get the token, if it exists
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Debug token info
  if (token) {
    console.log("Token found for path:", path, "- Role:", token.role, "- Admin:", token.isAdmin, "- Clerk:", token.isClerk);
    
    // Redirect from homepage to dashboard if user is authenticated
    if (isHomepage) {
      if (token.isAdmin) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else if (token.isClerk) {
        return NextResponse.redirect(new URL('/clerk/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  } else {
    console.log("No token found for path:", path);
  }

  // Public paths (other than homepage) should always be accessible
  if (isPublicPath || isHomepage) {
    // For auth pages, redirect to appropriate dashboard if already logged in
    if (token) {
      if ((path === '/admin-auth/login' || path === '/admin-auth/register') && token.isAdmin) {
        console.log("Admin already logged in, redirecting to admin dashboard");
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      
      if ((path === '/clerk-auth/login' || path === '/clerk-auth/register') && 
          (token.isClerk || token.isAdmin)) {
        console.log("Clerk already logged in, redirecting to clerk dashboard");
        return NextResponse.redirect(new URL('/clerk/dashboard', request.url));
      }
      
      if (path === '/login' || path === '/register') {
        console.log("User already logged in, redirecting to dashboard");
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    
    // For all other public paths, just continue
    return NextResponse.next();
  }

  // Protected routes - redirect to login if not authenticated
  if (!token) {
    console.log("No auth token for protected path:", path);
    
    // Determine the appropriate login page based on the path
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
  
  // Admin route protection
  if (path.startsWith('/admin')) {
    if (!token.isAdmin) {
      console.log("Non-admin attempting to access admin route:", path);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Clerk route protection
  if (path.startsWith('/clerk')) {
    if (!token.isClerk && !token.isAdmin) {
      console.log("Non-clerk attempting to access clerk route:", path);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Affiliate page protection - CHECK DATABASE INSTEAD OF TOKEN
  if (path.startsWith('/affiliate') && path !== '/affiliate/join') {
    try {
      // Check database for real-time affiliate status
      const user = await prisma.user.findUnique({
        where: { id: token.sub || token.id },
        select: { isAffiliate: true }
      });
      
      if (!user?.isAffiliate) {
        console.log("Non-affiliate attempting to access affiliate route:", path);
        return NextResponse.redirect(new URL('/affiliate/join', request.url));
      } else {
        console.log("Affiliate access granted for path:", path);
      }
    } catch (error) {
      console.error("Error checking affiliate status:", error);
      // Fallback to token check if database fails
      if (!token.isAffiliate) {
        console.log("Non-affiliate attempting to access affiliate route (fallback):", path);
        return NextResponse.redirect(new URL('/affiliate/join', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except for specific exclusions
    '/((?!api/(?!auth).*|_next/static|_next/image|favicon.ico).*)',
  ],
};