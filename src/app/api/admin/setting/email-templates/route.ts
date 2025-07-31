// /src/app/api/admin/settings/email-templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAdminAuth, logAdminAction, checkAdminRateLimit } from '@/lib/middleware/adminAuth';
import { emailTemplateSchema, paginationSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { getClientIP } from '@/lib/utils/ip';
import DOMPurify from 'isomorphic-dompurify';

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

interface EmailTemplatesResponse {
  templates: EmailTemplate[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ===== SECURITY: HTML SANITIZATION =====
function sanitizeHtmlContent(htmlContent: string): string {
  try {
    // Configure DOMPurify to allow email-safe HTML
    const cleanHtml = DOMPurify.sanitize(htmlContent, {
      ALLOWED_TAGS: [
        'div', 'span', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'img',
        'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'blockquote', 'pre', 'code'
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'style', 'class', 'id',
        'width', 'height', 'border', 'cellpadding', 'cellspacing',
        'align', 'valign', 'bgcolor', 'color'
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    });
    
    return cleanHtml;
  } catch (error) {
    logger.error('HTML sanitization failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error('Invalid HTML content');
  }
}

// ===== GET: FETCH EMAIL TEMPLATES =====
export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 60, 60000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // 2. Authentication & Authorization
    const authResult = await validateAdminAuth(request);
    if (!authResult.success) {
      return authResult.error!;
    }

    // 3. Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    const validationResult = paginationSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, search, sortBy, sort } = validationResult.data;

    // 4. Build query filters
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } }
      ];
    }

    // 5. Fetch templates with pagination
    const [templates, totalCount] = await Promise.all([
      prisma.emailTemplate.findMany({
        where,
        skip: page * limit,
        take: limit,
        orderBy: { [sortBy]: sort },
        select: {
          id: true,
          name: true,
          subject: true,
          htmlContent: true,
          active: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.emailTemplate.count({ where })
    ]);

    // 6. Format response
    const formattedTemplates: EmailTemplate[] = templates.map(template => ({
      id: template.id,
      name: template.name,
      subject: template.subject,
      htmlContent: template.htmlContent,
      active: template.active,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString()
    }));

    const response: EmailTemplatesResponse = {
      templates: formattedTemplates,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    };

    // 7. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'email_templates_list',
      { 
        count: templates.length,
        search: search || null,
        page,
        limit
      },
      request
    );

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('Email templates GET error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Failed to fetch email templates' },
      { status: 500 }
    );
  }
}

// ===== POST: CREATE EMAIL TEMPLATE =====
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting (stricter for write operations)
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 10, 60000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // 2. Authentication & Authorization
    const authResult = await validateAdminAuth(request);
    if (!authResult.success) {
      return authResult.error!;
    }

    // 3. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validationResult = emailTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const { name, subject, htmlContent, active } = validationResult.data;

    // 4. Check for duplicate template name
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { name },
      select: { id: true }
    });

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'A template with this name already exists' },
        { status: 409 }
      );
    }

    // 5. Sanitize HTML content
    const sanitizedHtmlContent = sanitizeHtmlContent(htmlContent);

    // 6. Create new email template
    const newTemplate = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        htmlContent: sanitizedHtmlContent,
        active
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

    // 7. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'email_template_create',
      {
        templateId: newTemplate.id,
        templateName: name,
        active
      },
      request
    );

    logger.info('Email template created successfully', {
      templateId: newTemplate.id,
      templateName: name,
      createdBy: authResult.user!.id
    });

    return NextResponse.json({
      success: true,
      data: {
        template: {
          id: newTemplate.id,
          name: newTemplate.name,
          subject: newTemplate.subject,
          htmlContent: newTemplate.htmlContent,
          active: newTemplate.active,
          createdAt: newTemplate.createdAt.toISOString(),
          updatedAt: newTemplate.updatedAt.toISOString()
        }
      },
      message: 'Email template created successfully'
    });

  } catch (error) {
    logger.error('Email template creation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Failed to create email template' },
      { status: 500 }
    );
  }
}

// ===== DELETE: BULK DELETE TEMPLATES =====
export async function DELETE(request: NextRequest) {
  try {
    // 1. Authentication & Authorization
    const authResult = await validateAdminAuth(request);
    if (!authResult.success) {
      return authResult.error!;
    }

    // 2. Parse request body for template IDs
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { templateIds } = body;
    
    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      return NextResponse.json(
        { error: 'Template IDs array is required' },
        { status: 400 }
      );
    }

    // 3. Validate template IDs
    if (templateIds.some(id => typeof id !== 'string' || id.length < 10)) {
      return NextResponse.json(
        { error: 'Invalid template ID format' },
        { status: 400 }
      );
    }

    // 4. Delete templates
    const deleteResult = await prisma.emailTemplate.deleteMany({
      where: {
        id: { in: templateIds }
      }
    });

    // 5. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'email_templates_delete',
      {
        templateIds,
        deletedCount: deleteResult.count
      },
      request
    );

    logger.info('Email templates deleted', {
      deletedCount: deleteResult.count,
      templateIds,
      deletedBy: authResult.user!.id
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: deleteResult.count
      },
      message: `${deleteResult.count} email template(s) deleted successfully`
    });

  } catch (error) {
    logger.error('Email templates deletion error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Failed to delete email templates' },
      { status: 500 }
    );
  }
}