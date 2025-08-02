import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth, logAdminAction, checkAdminRateLimit } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getClientIP } from '@/lib/utils/ip';
import { Prisma } from '@prisma/client';

// ===== TYPES =====
interface RouteParams {
  params: {
    id: string;
  };
}

interface UpdateEmailTemplateData {
  name?: string;
  subject?: string;
  htmlContent?: string;
  active?: boolean;
}

// ===== GET - FETCH SINGLE EMAIL TEMPLATE =====
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 60, 60000)) {
      logger.warn('Admin email template detail rate limit exceeded', { ip: clientIp });
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

    // 3. Validate template ID
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
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
      { 
        templateId: template.id,
        templateName: template.name,
        timestamp: new Date().toISOString()
      },
      request
    );

    // 6. Return success response
    return NextResponse.json({
      success: true,
      template: {
        ...template,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString()
      }
    });

  } catch (error) {
    logger.error('Email template detail API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      templateId: params.id,
      url: request.url
    });

    return NextResponse.json(
      { error: 'Failed to fetch email template. Please try again later.' },
      { status: 500 }
    );
  }
}

// ===== PUT - UPDATE EMAIL TEMPLATE =====
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 20, 60000)) {
      logger.warn('Admin email template update rate limit exceeded', { ip: clientIp });
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

    // 3. Validate template ID
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // 4. Parse and validate request body
    const body: UpdateEmailTemplateData = await request.json();
    const { name, subject, htmlContent, active } = body;

    // Validation
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Template name must be a non-empty string' },
          { status: 400 }
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: 'Template name must be 100 characters or less' },
          { status: 400 }
        );
      }
    }

    if (subject !== undefined) {
      if (typeof subject !== 'string' || subject.trim().length === 0) {
        return NextResponse.json(
          { error: 'Email subject must be a non-empty string' },
          { status: 400 }
        );
      }
      if (subject.length > 200) {
        return NextResponse.json(
          { error: 'Email subject must be 200 characters or less' },
          { status: 400 }
        );
      }
    }

    if (htmlContent !== undefined) {
      if (typeof htmlContent !== 'string' || htmlContent.trim().length === 0) {
        return NextResponse.json(
          { error: 'HTML content must be a non-empty string' },
          { status: 400 }
        );
      }
      if (htmlContent.length > 100000) {
        return NextResponse.json(
          { error: 'HTML content must be 100,000 characters or less' },
          { status: 400 }
        );
      }
    }

    // 5. Check if template exists
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id },
      select: { id: true, name: true, active: true }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }

    // 6. Check for name conflicts (if name is being updated)
    if (name !== undefined && name.trim() !== existingTemplate.name) {
      const nameConflict = await prisma.emailTemplate.findFirst({
        where: { 
          name: { equals: name.trim(), mode: 'insensitive' },
          NOT: { id }
        }
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: 'A template with this name already exists' },
          { status: 409 }
        );
      }
    }

    // 7. Build update data
    const updateData: Prisma.EmailTemplateUpdateInput = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (subject !== undefined) updateData.subject = subject.trim();
    if (htmlContent !== undefined) updateData.htmlContent = htmlContent.trim();
    if (active !== undefined) updateData.active = Boolean(active);

    // Check if there are any changes
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update provided' },
        { status: 400 }
      );
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
      'email_template_updated',
      { 
        templateId: updatedTemplate.id,
        templateName: updatedTemplate.name,
        changes: updateData,
        timestamp: new Date().toISOString()
      },
      request
    );

    // 10. Return success response
    return NextResponse.json({
      success: true,
      template: {
        ...updatedTemplate,
        createdAt: updatedTemplate.createdAt.toISOString(),
        updatedAt: updatedTemplate.updatedAt.toISOString()
      },
      message: 'Email template updated successfully'
    });

  } catch (error) {
    logger.error('Email template update API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      templateId: params.id,
      url: request.url
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Email template not found' },
          { status: 404 }
        );
      }
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
      { error: 'Failed to update email template. Please try again later.' },
      { status: 500 }
    );
  }
}

// ===== DELETE - DELETE EMAIL TEMPLATE =====
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Rate limiting
    const clientIp = getClientIP(request);
    if (!checkAdminRateLimit(clientIp, 10, 60000)) {
      logger.warn('Admin email template delete rate limit exceeded', { ip: clientIp });
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

    // 3. Validate template ID
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // 4. Check if template exists
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id },
      select: { id: true, name: true, active: true }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }

    // 5. Check if template is currently active (safety check)
    if (existingTemplate.active) {
      // You might want to require deactivation first, or allow force delete
      const url = new URL(request.url);
      const force = url.searchParams.get('force') === 'true';
      
      if (!force) {
        return NextResponse.json(
          { error: 'Cannot delete active template. Deactivate it first or use force=true parameter.' },
          { status: 409 }
        );
      }
    }

    // 6. Delete template
    await prisma.emailTemplate.delete({
      where: { id }
    });

    // 7. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'email_template_deleted',
      { 
        templateId: existingTemplate.id,
        templateName: existingTemplate.name,
        wasActive: existingTemplate.active,
        timestamp: new Date().toISOString()
      },
      request
    );

    // 8. Return success response
    return NextResponse.json({
      success: true,
      message: 'Email template deleted successfully'
    });

  } catch (error) {
    logger.error('Email template delete API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      templateId: params.id,
      url: request.url
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Email template not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete email template. Please try again later.' },
      { status: 500 }
    );
  }
}