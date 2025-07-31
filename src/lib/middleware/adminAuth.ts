// /src/lib/middleware/adminAuth.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getClientIP } from '@/lib/utils/ip';

export interface AdminAuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    isAdmin: boolean;
    isClerk: boolean;
    name: string | null;
  };
  error?: NextResponse;
}

/**
 * Secure admin authentication middleware
 * Validates session AND database user status
 */
export async function validateAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  try {
    // 1. Get session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      logger.warn('Admin auth attempt without session', {
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent'),
        url: request.url
      });
      
      return {
        success: false,
        error: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      };
    }

    // 2. Verify user exists and has admin privileges in database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        isClerk: true,
        createdAt: true
      }
    });

    if (!user) {
      logger.error('Admin auth: User not found in database', {
        sessionUserId: session.user.id,
        ip: getClientIP(request)
      });
      
      return {
        success: false,
        error: NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        )
      };
    }

    if (!user.isAdmin) {
      logger.warn('Admin auth: Non-admin user attempted access', {
        userId: user.id,
        email: user.email,
        ip: getClientIP(request),
        url: request.url
      });
      
      return {
        success: false,
        error: NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        )
      };
    }

    // 3. Log successful admin access
    logger.info('Admin access granted', {
      userId: user.id,
      email: user.email,
      endpoint: request.url,
      ip: getClientIP(request)
    });

    return {
      success: true,
      user
    };

  } catch (error) {
    logger.error('Admin auth middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url
    });

    return {
      success: false,
      error: NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 500 }
      )
    };
  }
}

/**
 * Rate limiting for admin endpoints
 */
const adminRateLimit = new Map<string, { count: number; resetTime: number }>();

export function checkAdminRateLimit(identifier: string, maxRequests = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const current = adminRateLimit.get(identifier);
  
  if (!current || current.resetTime < windowStart) {
    adminRateLimit.set(identifier, { count: 1, resetTime: now });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

/**
 * Audit logging for admin actions
 */
export async function logAdminAction(
  userId: string,
  action: string,
  details: Record<string, any>,
  request: NextRequest
) {
  try {
    await prisma.auditLog.create({
      data: {
        eventType: `admin_${action}`,
        userId,
        details,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent')
      }
    });
  } catch (error) {
    logger.error('Failed to log admin action', {
      userId,
      action,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}