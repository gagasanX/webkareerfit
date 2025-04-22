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

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const status = searchParams.get('status') || 'all';
    const gateway = searchParams.get('gateway') || 'all';
    
    // Build the where clause for filtering
    let where: any = {};
    
    // Date filtering
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(`${startDate}T00:00:00Z`),
        lte: new Date(`${endDate}T23:59:59Z`),
      };
    } else if (startDate) {
      where.createdAt = {
        gte: new Date(`${startDate}T00:00:00Z`),
      };
    } else if (endDate) {
      where.createdAt = {
        lte: new Date(`${endDate}T23:59:59Z`),
      };
    }
    
    // Status filtering
    if (status !== 'all') {
      where.status = status;
    }
    
    // Gateway filtering
    if (gateway !== 'all') {
      where.gateway = gateway;
    }
    
    // Fetch all transactions matching the criteria
    const transactions = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assessment: {
          select: {
            id: true,
            type: true,
          },
        },
      },
    });
    
    // Transform the data for CSV export
    const formattedTransactions = transactions.map((transaction: any) => ({
      'Transaction ID': transaction.id,
      'Reference ID': transaction.referenceId || '',
      'User Name': transaction.user?.name || 'Unknown',
      'User Email': transaction.user?.email || '',
      'User ID': transaction.userId,
      'Assessment Type': transaction.assessment?.type || '',
      'Assessment ID': transaction.assessmentId,
      'Amount': transaction.amount,
      'Currency': transaction.currency || 'USD',
      'Status': transaction.status,
      'Payment Gateway': transaction.gateway || transaction.method || 'Unknown',
      'Created At': transaction.createdAt.toISOString(),
      'Updated At': transaction.updatedAt.toISOString(),
    }));
    
    // Generate CSV
    const header = Object.keys(formattedTransactions[0] || {}).join(',') + '\r\n';
    const rows = formattedTransactions.map((transaction: any) => 
      Object.values(transaction).map((value: any) => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    ).join('\r\n');
    
    const csv = header + rows;
    
    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="payment-report-${startDate}-to-${endDate}.csv"`);
    
    return new Response(csv, { headers });
  } catch (error) {
    console.error('Error generating payment report:', error);
    return NextResponse.json(
      { error: 'Failed to generate payment report' },
      { status: 500 }
    );
  }
}