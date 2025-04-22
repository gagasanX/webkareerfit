import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    
    // Fetch specific email template
    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    
    if (!template) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching email template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email template' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.subject || !data.htmlContent) {
      return NextResponse.json(
        { error: 'Name, subject, and HTML content are required fields' },
        { status: 400 }
      );
    }
    
    // Check if template exists
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    
    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }
    
    // Check if new name conflicts with another template
    if (data.name !== existingTemplate.name) {
      const nameConflict = await prisma.emailTemplate.findUnique({
        where: { name: data.name },
      });
      
      if (nameConflict && nameConflict.id !== id) {
        return NextResponse.json(
          { error: 'Another template with this name already exists' },
          { status: 400 }
        );
      }
    }
    
    // Update email template
    const updatedTemplate = await prisma.emailTemplate.update({
      where: { id },
      data: {
        name: data.name,
        subject: data.subject,
        htmlContent: data.htmlContent,
        active: data.active ?? true,
      },
    });
    
    return NextResponse.json({ 
      template: updatedTemplate,
      message: 'Email template updated successfully' 
    });
  } catch (error) {
    console.error('Error updating email template:', error);
    return NextResponse.json(
      { error: 'Failed to update email template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    
    // Check if template exists
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    
    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }
    
    // Delete email template
    await prisma.emailTemplate.delete({
      where: { id },
    });
    
    return NextResponse.json({ 
      message: 'Email template deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting email template:', error);
    return NextResponse.json(
      { error: 'Failed to delete email template' },
      { status: 500 }
    );
  }
}