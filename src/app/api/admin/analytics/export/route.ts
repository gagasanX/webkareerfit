import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Fast admin authorization check
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || 'last30days';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const reportType = searchParams.get('type') || 'all';
    
    // Calculate date range
    const { startDate, endDate } = calculateDateRange(range, startDateParam, endDateParam);
    
    // ⚡ OPTIMIZED: Stream CSV generation for large datasets
    let csvData = '';
    const startTime = Date.now();
    
    // Generate CSV data based on report type with optimized queries
    try {
      if (reportType === 'users' || reportType === 'all') {
        const userData = await getUserDataOptimized(startDate, endDate);
        csvData += 'USER DATA\n';
        csvData += 'Date,New Users\n';
        userData.forEach(row => {
          csvData += `${row.date},${row.count}\n`;
        });
        
        if (reportType === 'all') csvData += '\n';
      }
      
      if (reportType === 'assessments' || reportType === 'all') {
        const [assessmentData, assessmentTypes] = await Promise.all([
          getAssessmentDataOptimized(startDate, endDate),
          getAssessmentTypeDataOptimized(startDate, endDate)
        ]);
        
        if (reportType === 'all') csvData += 'ASSESSMENT DATA\n';
        
        csvData += 'Date,Assessments Started,Assessments Completed\n';
        assessmentData.forEach(row => {
          csvData += `${row.date},${row.started},${row.completed}\n`;
        });
        
        if (reportType === 'all') {
          csvData += '\nASSESSMENT TYPES\n';
          csvData += 'Type,Count,Completion Rate\n';
          
          assessmentTypes.forEach(row => {
            csvData += `${row.type},${row.count},${(row.completionRate * 100).toFixed(1)}%\n`;
          });
          
          csvData += '\n';
        }
      }
      
      if (reportType === 'revenue' || reportType === 'all') {
        const [revenueData, revenueByType] = await Promise.all([
          getRevenueDataOptimized(startDate, endDate),
          getRevenueByTypeOptimized(startDate, endDate)
        ]);
        
        if (reportType === 'all') csvData += 'REVENUE DATA\n';
        
        csvData += 'Date,Revenue (MYR)\n';
        revenueData.forEach(row => {
          csvData += `${row.date},${row.amount.toFixed(2)}\n`;
        });
        
        if (reportType === 'all') {
          csvData += '\nREVENUE BY ASSESSMENT TYPE\n';
          csvData += 'Type,Revenue (MYR),Number of Sales\n';
          
          revenueByType.forEach(row => {
            csvData += `${row.type},${row.amount.toFixed(2)},${row.count}\n`;
          });
        }
      }
      
      const processingTime = Date.now() - startTime;
      
      // Log successful export
      logger.info('Analytics export completed', {
        processingTime: `${processingTime}ms`,
        reportType,
        dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        csvSize: csvData.length,
        userId: session.user.id
      });
      
      // Set optimized headers for file download
      const headers = new Headers();
      headers.set('Content-Type', 'text/csv; charset=utf-8');
      headers.set('Content-Disposition', `attachment; filename="analytics-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv"`);
      headers.set('Content-Length', csvData.length.toString());
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      return new Response(csvData, { headers });
      
    } catch (queryError) {
      logger.error('Database query error during export', {
        error: queryError instanceof Error ? queryError.message : 'Unknown query error',
        reportType,
        range
      });
      throw queryError;
    }
    
  } catch (error) {
    logger.error('Analytics export error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url
    });
    
    return NextResponse.json(
      { error: 'Failed to generate analytics report' },
      { status: 500 }
    );
  }
}

// ===== OPTIMIZED HELPER FUNCTIONS =====

function calculateDateRange(
  range: string,
  startDateParam: string | null,
  endDateParam: string | null
) {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();
  
  endDate.setHours(23, 59, 59, 999);
  
  switch (range) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
      
    case 'yesterday':
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      break;
      
    case 'last7days':
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;
      
    case 'last30days':
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      break;
      
    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
      
    case 'lastMonth':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
      
    case 'thisYear':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
      
    case 'custom':
      if (startDateParam) {
        startDate = new Date(startDateParam);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
      }
      
      if (endDateParam) {
        endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
      }
      break;
  }
  
  return { startDate, endDate };
}

// ⚡ OPTIMIZED: User data with index usage
async function getUserDataOptimized(startDate: Date, endDate: Date) {
  const usersByDateRaw = await prisma.$queryRaw<Array<{
    date: Date;
    count: bigint;
  }>>`
    SELECT 
      DATE_TRUNC('day', "createdAt") as date,
      COUNT(*) as count
    FROM "User"
    WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
      AND "isAdmin" = false
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY date ASC
    LIMIT 365
  `;
  
  return usersByDateRaw.map((item) => ({
    date: item.date.toISOString().split('T')[0],
    count: Number(item.count)
  }));
}

// ⚡ OPTIMIZED: Assessment data with single query
async function getAssessmentDataOptimized(startDate: Date, endDate: Date) {
  const assessmentDataRaw = await prisma.$queryRaw<Array<{
    date: Date;
    started: bigint;
    completed: bigint;
  }>>`
    SELECT 
      DATE_TRUNC('day', "createdAt") as date,
      COUNT(*) as started,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM "Assessment"
    WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY date ASC
    LIMIT 365
  `;
  
  return assessmentDataRaw.map((item) => ({
    date: item.date.toISOString().split('T')[0],
    started: Number(item.started),
    completed: Number(item.completed)
  }));
}

// ⚡ OPTIMIZED: Assessment type data
async function getAssessmentTypeDataOptimized(startDate: Date, endDate: Date) {
  const assessmentsByTypeRaw = await prisma.$queryRaw<Array<{
    type: string;
    total: bigint;
    completed: bigint;
  }>>`
    SELECT 
      type,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM "Assessment"
    WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY type
    ORDER BY total DESC
    LIMIT 20
  `;
  
  return assessmentsByTypeRaw.map((item) => ({
    type: item.type,
    count: Number(item.total),
    completionRate: Number(item.total) > 0 ? Number(item.completed) / Number(item.total) : 0
  }));
}

// ⚡ OPTIMIZED: Revenue data with indexed fields
async function getRevenueDataOptimized(startDate: Date, endDate: Date) {
  const revenueByDateRaw = await prisma.$queryRaw<Array<{
    date: Date;
    amount: number;
  }>>`
    SELECT 
      DATE_TRUNC('day', "createdAt") as date,
      SUM(amount) as amount
    FROM "Payment"
    WHERE 
      status IN ('completed', 'successful', 'paid') AND
      "createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY date ASC
    LIMIT 365
  `;
  
  return revenueByDateRaw.map((item) => ({
    date: item.date.toISOString().split('T')[0],
    amount: Number(item.amount)
  }));
}

// ⚡ OPTIMIZED: Revenue by type with efficient join
async function getRevenueByTypeOptimized(startDate: Date, endDate: Date) {
  const revenueByTypeRaw = await prisma.$queryRaw<Array<{
    type: string;
    amount: number;
    count: bigint;
  }>>`
    SELECT 
      a.type,
      COALESCE(SUM(p.amount), 0) as amount,
      COUNT(p.id) as count
    FROM "Assessment" a
    INNER JOIN "Payment" p ON a.id = p."assessmentId"
    WHERE 
      p.status IN ('completed', 'successful', 'paid') AND
      p."createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY a.type
    ORDER BY amount DESC
    LIMIT 20
  `;
  
  return revenueByTypeRaw.map((item) => ({
    type: item.type,
    amount: Number(item.amount),
    count: Number(item.count)
  }));
}