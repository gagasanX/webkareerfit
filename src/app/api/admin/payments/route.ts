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
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const status = searchParams.get('status') || 'all';
    const gateway = searchParams.get('gateway') || 'all';
    
    // Calculate pagination
    const skip = page * limit;
    
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
    
    // Search filtering
    if (search) {
      where.OR = [
        { id: { contains: search } },
        { referenceId: { contains: search } },
        { assessment: { type: { contains: search } } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }
    
    // Fetch transactions with pagination
    const [transactions, totalCount] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
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
      }),
      prisma.payment.count({ where }),
    ]);
    
    // Transform the data to simplify the structure
    const formattedTransactions = transactions.map((transaction: any) => ({
      id: transaction.id,
      userId: transaction.userId,
      userName: transaction.user?.name || transaction.user?.email || 'Unknown',
      userEmail: transaction.user?.email,
      assessmentId: transaction.assessmentId,
      assessmentTitle: transaction.assessment?.type || 'Unknown',
      amount: transaction.amount,
      currency: transaction.currency || 'USD',
      status: transaction.status,
      gateway: transaction.gateway || transaction.method || 'Unknown',
      referenceId: transaction.referenceId || '',
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    }));
    
    // Calculate revenue stats
    // Get all successful transactions in the period for stats
    const allTransactions = await prisma.payment.findMany({
      where: {
        ...where,
        status: { in: ['successful', 'completed', 'paid'] },
      },
    });
    
    const totalRevenue = allTransactions.reduce((sum: number, transaction: any) => sum + transaction.amount, 0);
    const totalTransactions = await prisma.payment.count({ where });
    const successfulTransactions = await prisma.payment.count({
      where: {
        ...where,
        status: { in: ['successful', 'completed', 'paid'] },
      },
    });
    const failedTransactions = await prisma.payment.count({
      where: {
        ...where,
        status: { in: ['failed', 'cancelled'] },
      },
    });
    
    const stats = {
      totalRevenue,
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      averageTransactionValue: successfulTransactions > 0 ? totalRevenue / successfulTransactions : 0,
      currency: 'USD', // Default currency, should be dynamic based on your system
    };
    
    // Get payment method breakdown using raw SQL since groupBy has type issues
    const paymentMethods = await prisma.$queryRaw`
      SELECT 
        COALESCE("gateway", 'Unknown') as gateway,
        COUNT(*) as count,
        SUM(amount) as "totalAmount"
      FROM "Payment"
      WHERE status IN ('successful', 'completed', 'paid')
      GROUP BY "gateway"
      ORDER BY "totalAmount" DESC
    `;
    
    // Format payment method breakdown for frontend
    const paymentMethodBreakdown = Array.isArray(paymentMethods)
      ? paymentMethods.map((method: any) => ({
          gateway: method.gateway || 'Unknown',
          count: parseInt(method.count),
          totalAmount: parseFloat(method.totalAmount) || 0,
        }))
      : [];
    
    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats,
      paymentMethodBreakdown,
    });
  } catch (error) {
    console.error('Error fetching payment data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment data' },
      { status: 500 }
    );
  }
}