// /src/app/api/admin/settings/email-templates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAdminAuth, logAdminAction, checkAdminRateLimit } from '@/lib/middleware/adminAuth';
import { emailTemplateUpdateSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { getClientIP } from '@/lib/utils/ip';
import DOMPurify from 'isomorphic-dompurify';

// ===== SECURITY: HTML SANITIZATION =====
function sanitizeHtmlContent(htmlContent: string): string {
  try {
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

// ===== GET: FETCH SINGLE EMAIL TEMPLATE =====
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 3. Validate template ID
    const { id } = params;
    if (!id || typeof id !== 'string' || id.length < 10) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    // 4. Fetch template
    const template = await prisma.emailTemplate.findUnique({
      where: { id },
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

    if (!template) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }

    // 5. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'email_template_view',
      { templateId: id, templateName: template.name },
      request
    );

    return NextResponse.json({
      success: true,
      data: {
        template: {
          id: template.id,
          name: template.name,
          subject: template.subject,
          htmlContent: template.htmlContent,
          active: template.active,
          createdAt: template.createdAt.toISOString(),
          updatedAt: template.updatedAt.toISOString()
        }
      }
    });

  } catch (error) {
    logger.error('Email template GET error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      templateId: params.id
    });

    return NextResponse.json(
      { error: 'Failed to fetch email template' },
      { status: 500 }
    );
  }
}

// ===== PUT: UPDATE EMAIL TEMPLATE =====
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 3. Validate template ID
    const { id } = params;
    if (!id || typeof id !== 'string' || id.length < 10) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    // 4. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validationResult = emailTemplateUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // 5. Check if template exists
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }

    // 6. Check for name conflicts (if name is being updated)
    if (updateData.name && updateData.name !== existingTemplate.name) {
      const nameConflict = await prisma.emailTemplate.findFirst({
        where: { 
          name: updateData.name,
          id: { not: id }
        },
        select: { id: true }
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: 'A template with this name already exists' },
          { status: 409 }
        );
      }
    }

    // 7. Sanitize HTML content if provided
    if (updateData.htmlContent) {
      updateData.htmlContent = sanitizeHtmlContent(updateData.htmlContent);
    }

    // 8. Update template
    const updatedTemplate = await prisma.emailTemplate.update({
      where: { id },
      data: updateData,
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

    // 9. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'email_template_update',
      {
        templateId: id,
        templateName: updatedTemplate.name,
        updatedFields: Object.keys(updateData)
      },
      request
    );

    logger.info('Email template updated successfully', {
      templateId: id,
      templateName: updatedTemplate.name,
      updatedFields: Object.keys(updateData),
      updatedBy: authResult.user!.id
    });

    return NextResponse.json({
      success: true,
      data: {
        template: {
          id: updatedTemplate.id,
          name: updatedTemplate.name,
          subject: updatedTemplate.subject,
          htmlContent: updatedTemplate.htmlContent,
          active: updatedTemplate.active,
          createdAt: updatedTemplate.createdAt.toISOString(),
          updatedAt: updatedTemplate.updatedAt.toISOString()
        }
      },
      message: 'Email template updated successfully'
    });

  } catch (error) {
    logger.error('Email template update error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      templateId: params.id
    });

    return NextResponse.json(
      { error: 'Failed to update email template' },
      { status: 500 }
    );
  }
}

// ===== DELETE: DELETE EMAIL TEMPLATE =====
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Rate limiting
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

    // 3. Validate template ID
    const { id } = params;
    if (!id || typeof id !== 'string' || id.length < 10) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    // 4. Check if template exists and get name for logging
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }

    // 5. Delete template
    await prisma.emailTemplate.delete({
      where: { id }
    });

    // 6. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'email_template_delete',
      {
        templateId: id,
        templateName: existingTemplate.name
      },
      request
    );

    logger.info('Email template deleted successfully', {
      templateId: id,
      templateName: existingTemplate.name,
      deletedBy: authResult.user!.id
    });

    return NextResponse.json({
      success: true,
      message: 'Email template deleted successfully'
    });

  } catch (error) {
    logger.error('Email template deletion error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      templateId: params.id
    });

    return NextResponse.json(
      { error: 'Failed to delete email template' },
      { status: 500 }
    );
  }
}