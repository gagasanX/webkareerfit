import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

// Fungsi where clause yang sama
function buildWhereClause(searchParams: URLSearchParams) {
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const status = searchParams.get('status') || 'all';
  const method = searchParams.get('method') || 'all'; // Diubah dari 'gateway'

  let where: any = {};
  if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(`${startDate}T00:00:00Z`) };
  if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(`${endDate}T23:59:59Z`) };
  if (status !== 'all') where.status = status;
  if (method !== 'all') where.method = method; // Diubah dari 'gateway'
  return where;
}

function toCSVString(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return new Response('Unauthorized', { status: 401 });
    }

    const where = buildWhereClause(request.nextUrl.searchParams);
    const CHUNK_SIZE = 500;

    // OPTIMIZATION: Gunakan ReadableStream untuk hantar data secara berperingkat
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const csvHeaders = [
          'Transaction ID', 'Gateway Payment ID', 'User Name', 'User Email', 'User ID',
          'Assessment Type', 'Assessment ID', 'Amount (MYR)', 'Status',
          'Payment Method', 'Created At', 'Updated At'
        ].join(',');
        controller.enqueue(encoder.encode(csvHeaders + '\r\n'));

        let cursor = '';

        while (true) {
          const transactions = await prisma.payment.findMany({
            take: CHUNK_SIZE,
            ...(cursor && { skip: 1, cursor: { id: cursor } }),
            where,
            orderBy: { id: 'asc' }, 
            include: {
              user: { select: { name: true, email: true } },
              assessment: { select: { type: true } },
            },
          });

          if (transactions.length === 0) break;

          for (const tx of transactions) {
            const row = [
              tx.id,
              tx.gatewayPaymentId || '', // Diubah
              tx.user?.name || 'Unknown',
              tx.user?.email || '',
              tx.userId,
              tx.assessment?.type || '',
              tx.assessmentId,
              tx.amount,
              tx.status,
              tx.method, // Diubah
              tx.createdAt.toISOString(),
              tx.updatedAt.toISOString(),
            ].map(toCSVString).join(',');
            
            controller.enqueue(encoder.encode(row + '\r\n'));
          }
          cursor = transactions[transactions.length - 1].id;
        }
        controller.close();
      },
    });

    const reportDate = new Date().toISOString().split('T')[0];
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv; charset=utf-8');
    headers.set('Content-Disposition', `attachment; filename="payment-report-${reportDate}.csv"`);

    return new Response(stream, { headers });

  } catch (error) {
    console.error('Error generating payment report:', error);
    return new Response('Failed to generate payment report', { status: 500 });
  }
}