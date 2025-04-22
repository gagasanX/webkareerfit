import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all email templates
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { name: 'asc' },
    });
    
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.subject || !data.htmlContent) {
      return NextResponse.json(
        { error: 'Name, subject, and HTML content are required fields' },
        { status: 400 }
      );
    }
    
    // Check if template with same name already exists
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { name: data.name },
    });
    
    if (existingTemplate) {
      return NextResponse.json(
        { error: 'A template with this name already exists' },
        { status: 400 }
      );
    }
    
    // Create new email template
    const newTemplate = await prisma.emailTemplate.create({
      data: {
        name: data.name,
        subject: data.subject,
        htmlContent: data.htmlContent,
        active: data.active ?? true,
      },
    });
    
    return NextResponse.json({ 
      template: newTemplate,
      message: 'Email template created successfully' 
    });
  } catch (error) {
    console.error('Error creating email template:', error);
    return NextResponse.json(
      { error: 'Failed to create email template' },
      { status: 500 }
    );
  }
}