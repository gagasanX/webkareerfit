import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

function buildWhereClause(searchParams: URLSearchParams) {
  const search = searchParams.get('search') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const status = searchParams.get('status') || 'all';
  const method = searchParams.get('method') || 'all'; // Diubah dari 'gateway'

  let where: any = {};

  if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(`${startDate}T00:00:00Z`) };
  if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(`${endDate}T23:59:59Z`) };
  if (status !== 'all') where.status = status;
  if (method !== 'all') where.method = method; // Diubah dari 'gateway'

  if (search) {
    where.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { gatewayPaymentId: { contains: search, mode: 'insensitive' } }, // Diubah dari 'referenceId'
      { assessment: { type: { contains: search, mode: 'insensitive' } } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }
  
  return where;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = page * limit;
    
    const where = buildWhereClause(searchParams);

    // OPTIMIZATION: Jalankan semua query secara serentak
    const [transactionsData, statsData, paymentMethodBreakdownData] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          assessment: { select: { id: true, type: true } },
        },
      }),
      getAggregatedStats(where),
      prisma.payment.groupBy({
        by: ['method'], // Diubah dari 'gateway'
        where: { ...where, status: 'completed' },
        _count: { _all: true },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } }
      }),
    ]);

    // Format data transaksi mengikut schema
    const formattedTransactions = transactionsData.map((tx: any) => ({
      id: tx.id,
      userId: tx.userId,
      userName: tx.user?.name || tx.user?.email || 'Unknown',
      assessmentId: tx.assessmentId,
      assessmentTitle: tx.assessment?.type || 'Unknown',
      amount: tx.amount,
      status: tx.status,
      method: tx.method, // Diubah dari 'gateway'
      gatewayPaymentId: tx.gatewayPaymentId || '', // Diubah dari 'referenceId'
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
    }));
    
    // Format data pecahan kaedah pembayaran
    const paymentMethodBreakdown = paymentMethodBreakdownData.map(item => ({
      method: item.method, // Diubah dari 'gateway'
      count: item._count._all,
      totalAmount: item._sum.amount || 0,
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        total: statsData.totalTransactions,
        page,
        limit,
        totalPages: Math.ceil(statsData.totalTransactions / limit),
      },
      stats: statsData,
      paymentMethodBreakdown,
    });
  } catch (error) {
    console.error('Error fetching payment data:', error);
    return NextResponse.json({ error: 'Failed to fetch payment data' }, { status: 500 });
  }
}

// OPTIMIZATION: Fungsi helper untuk agregasi pantas
async function getAggregatedStats(where: any) {
  const [
    totalCount,
    successfulStats,
    pendingStats,
    failedCount
  ] = await prisma.$transaction([
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      where: { ...where, status: 'completed' },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: { ...where, status: 'pending' },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.count({ where: { ...where, status: { in: ['failed', 'cancelled'] } } }),
  ]);
  
  const totalRevenue = successfulStats._sum.amount || 0;
  const successfulTransactions = successfulStats._count._all;

  return {
    totalRevenue,
    pendingAmount: pendingStats._sum.amount || 0,
    totalTransactions: totalCount,
    successfulTransactions,
    pendingTransactionsCount: pendingStats._count._all,
    failedTransactions: failedCount,
    averageTransactionValue: successfulTransactions > 0 ? totalRevenue / successfulTransactions : 0,
    currency: 'MYR', // Mata wang tetap
  };
}