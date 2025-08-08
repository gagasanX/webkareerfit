import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Fungsi untuk menukar data ke baris CSV yang selamat
function toCSVRow(data: any[]): string {
    return data.map(value => {
        const str = String(value ?? '');
        if (/[",\r\n]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }).join(',') + '\r\n';
}

// Helper untuk menulis seksyen CSV ke stream
async function streamSection(
    controller: ReadableStreamDefaultController,
    encoder: TextEncoder,
    title: string,
    headers: string[],
    query: Promise<any[]>
) {
    controller.enqueue(encoder.encode(`${title}\n`));
    controller.enqueue(encoder.encode(toCSVRow(headers)));
    const data = await query;
    for (const row of data) {
        controller.enqueue(encoder.encode(toCSVRow(Object.values(row))));
    }
    controller.enqueue(encoder.encode('\n')); // Baris kosong antara seksyen
}

// Helper untuk julat tarikh (sama seperti di atas)
function calculateDateRange(range: string, startDateParam: string | null, endDateParam: string | null) {
  const now = new Date(); let start = new Date(); let end = new Date();
  switch (range) {
    case 'today': start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); break;
    case 'last7days': start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); break;
    case 'last30days': start.setDate(now.getDate() - 29); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); break;
    default: start.setDate(now.getDate() - 29); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
  }
  if (range === 'custom') {
      start = startDateParam ? new Date(startDateParam) : start;
      end = endDateParam ? new Date(endDateParam) : end;
  }
  return { start, end };
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isAdmin) {
            return new Response('Unauthorized', { status: 401 });
        }

        const { searchParams } = request.nextUrl;
        const { start, end } = calculateDateRange(
            searchParams.get('range') || 'last30days',
            searchParams.get('startDate'),
            searchParams.get('endDate')
        );

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const startTime = Date.now();
                
                controller.enqueue(encoder.encode(toCSVRow([`Analytics Report: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`])));
                controller.enqueue(encoder.encode('\n'));
                
                // 1. Overview
                const overviewQuery = prisma.$transaction([
                    prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
                    prisma.assessment.count({ where: { createdAt: { gte: start, lte: end } } }),
                    prisma.payment.aggregate({ where: { status: 'completed', createdAt: { gte: start, lte: end } }, _sum: { amount: true } })
                ]);
                const overviewData = await overviewQuery;
                controller.enqueue(encoder.encode('OVERVIEW\n'));
                controller.enqueue(encoder.encode(toCSVRow(['Metric', 'Value'])));
                controller.enqueue(encoder.encode(toCSVRow(['Total Users', overviewData[0] ])));
                controller.enqueue(encoder.encode(toCSVRow(['Total Assessments', overviewData[1] ])));
                controller.enqueue(encoder.encode(toCSVRow(['Total Revenue (MYR)', overviewData[2]._sum.amount || 0 ])));
                controller.enqueue(encoder.encode('\n'));

                // 2. Assessment Types
                const assessmentTypesQuery = prisma.assessment.groupBy({ by: ['type'], where: { createdAt: { gte: start, lte: end } }, _count: { id: true }, _sum: { price: true } })
                    .then(res => res.map(r => ({ Type: r.type, Count: r._count.id, Revenue: r._sum.price || 0 })));
                await streamSection(controller, encoder, 'ASSESSMENT TYPES', ['Type', 'Count', 'Revenue (MYR)'], assessmentTypesQuery);

                // 3. Top Affiliates
                const affiliatesQuery = prisma.referral.groupBy({ by: ['affiliateId'], where: { status: 'completed', createdAt: { gte: start, lte: end } }, _count: { id: true }, _sum: { commission: true }, orderBy: { _sum: { commission: 'desc' } }, take: 10 })
                    .then(res => res.map(r => ({ AffiliateID: r.affiliateId, Referrals: r._count.id, Earnings: r._sum.commission || 0 })));
                await streamSection(controller, encoder, 'TOP AFFILIATES', ['Affiliate ID', 'Referrals', 'Earnings (MYR)'], affiliatesQuery);

                logger.info(`Analytics export stream completed in ${Date.now() - startTime}ms`);
                controller.close();
            }
        });

        const headers = new Headers();
        headers.set('Content-Type', 'text/csv; charset=utf-8');
        headers.set('Content-Disposition', `attachment; filename="analytics-report-${new Date().toISOString().split('T')[0]}.csv"`);

        return new Response(stream, { headers });

    } catch (error) {
        logger.error('Failed to generate analytics export', { error });
        return new Response('Error generating report.', { status: 500 });
    }
}