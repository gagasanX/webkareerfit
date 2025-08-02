import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth, logAdminAction, checkAdminRateLimit } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getClientIP } from '@/lib/utils/ip';
import { Prisma } from '@prisma/client';

// ===== TYPES =====
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateEmailTemplateData {
  name: string;
  subject: string;
  htmlContent: string;
  active?: boolean;
}

// ===== GET - LIST EMAIL TEMPLATES =====
export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 60, 60000)) {
      logger.warn('Admin email templates rate limit exceeded', { ip: clientIp });
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. Authentication & Authorization
    const authResult = await validateAdminAuth(request);
    if (!authResult.success) {
      return authResult.error!;
    }

    // 3. Parse query parameters
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('includeInactive') === 'true';
    const search = url.searchParams.get('search') || '';

    // 4. Build where clause
    const whereClause: Prisma.EmailTemplateWhereInput = {};

    // Active filter
    if (!includeInactive) {
      whereClause.active = true;
    }

    // Search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } }
      ];
    }

    // 5. Fetch templates
    const templates = await prisma.emailTemplate.findMany({
      where: whereClause,
      orderBy: [
        { active: 'desc' }, // Active templates first
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        subject: true,
        htmlContent: true,
        active: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // 6. Format response
    const formattedTemplates: EmailTemplate[] = templates.map(template => ({
      ...template,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString()
    }));

    // 7. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'email_templates_list_view',
      { 
        search,
        includeInactive,
        resultCount: formattedTemplates.length,
        timestamp: new Date().toISOString()
      },
      request
    );

    // 8. Return success response
    return NextResponse.json({
      success: true,
      templates: formattedTemplates,
      metadata: {
        totalCount: formattedTemplates.length,
        search,
        includeInactive
      }
    });

  } catch (error) {
    logger.error('Email templates list API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url
    });

    return NextResponse.json(
      { error: 'Failed to fetch email templates. Please try again later.' },
      { status: 500 }
    );
  }
}

// ===== POST - CREATE EMAIL TEMPLATE =====
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 10, 60000)) {
      logger.warn('Admin email template creation rate limit exceeded', { ip: clientIp });
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. Authentication & Authorization
    const authResult = await validateAdminAuth(request);
    if (!authResult.success) {
      return authResult.error!;
    }

    // 3. Parse and validate request body
    const body: CreateEmailTemplateData = await request.json();
    const { name, subject, htmlContent, active = true } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json(
        { error: 'Email subject is required' },
        { status: 400 }
      );
    }

    if (!htmlContent || typeof htmlContent !== 'string' || htmlContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      );
    }

    // Length validation
    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Template name must be 100 characters or less' },
        { status: 400 }
      );
    }

    if (subject.length > 200) {
      return NextResponse.json(
        { error: 'Email subject must be 200 characters or less' },
        { status: 400 }
      );
    }

    if (htmlContent.length > 100000) {
      return NextResponse.json(
        { error: 'HTML content must be 100,000 characters or less' },
        { status: 400 }
      );
    }

    // 4. Check if template name already exists
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' } }
    });

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'A template with this name already exists' },
        { status: 409 }
      );
    }

    // 5. Create template
    const newTemplate = await prisma.emailTemplate.create({
      data: {
        name: name.trim(),
        subject: subject.trim(),
        htmlContent: htmlContent.trim(),
        active: Boolean(active)
      },
      select: {
        id: true,
        name: true,
        subject: true,
        htmlContent: true,
        active: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // 6. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'email_template_created',
      { 
        templateId: newTemplate.id,
        templateName: newTemplate.name,
        active: newTemplate.active,
        timestamp: new Date().toISOString()
      },
      request
    );

    // 7. Return success response
    return NextResponse.json({
      success: true,
      template: {
        ...newTemplate,
        createdAt: newTemplate.createdAt.toISOString(),
        updatedAt: newTemplate.updatedAt.toISOString()
      },
      message: 'Email template created successfully'
    }, { status: 201 });

  } catch (error) {
    logger.error('Email template creation API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[];
        if (target?.includes('name')) {
          return NextResponse.json(
            { error: 'A template with this name already exists' },
            { status: 409 }
          );
        }
      }
    }

    return NextResponse.json(
      { error: 'Failed to create email template. Please try again later.' },
      { status: 500 }
    );
  }
}