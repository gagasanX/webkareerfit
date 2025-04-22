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
    const range = searchParams.get('range') || 'last30days';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const reportType = searchParams.get('type') || 'all'; // Can be 'users', 'assessments', 'revenue', 'all'
    
    // Calculate date range
    const { startDate, endDate } = calculateDateRange(range, startDateParam, endDateParam);
    
    // Generate CSV data based on report type
    let csvData = '';
    
    if (reportType === 'users' || reportType === 'all') {
      const userData = await getUserData(startDate, endDate);
      csvData += 'USER DATA\n';
      csvData += 'Date,New Users\n';
      userData.forEach(row => {
        csvData += `${row.date},${row.count}\n`;
      });
      
      if (reportType === 'all') {
        csvData += '\n';
      }
    }
    
    if (reportType === 'assessments' || reportType === 'all') {
      const assessmentData = await getAssessmentData(startDate, endDate);
      
      if (reportType === 'all') {
        csvData += 'ASSESSMENT DATA\n';
      }
      
      csvData += 'Date,Assessments Started,Assessments Completed\n';
      assessmentData.forEach(row => {
        csvData += `${row.date},${row.started},${row.completed}\n`;
      });
      
      if (reportType === 'all') {
        csvData += '\n';
        
        csvData += 'ASSESSMENT TYPES\n';
        csvData += 'Type,Count,Completion Rate\n';
        
        const assessmentTypes = await getAssessmentTypeData(startDate, endDate);
        assessmentTypes.forEach(row => {
          csvData += `${row.type},${row.count},${(row.completionRate * 100).toFixed(1)}%\n`;
        });
        
        csvData += '\n';
      }
    }
    
    if (reportType === 'revenue' || reportType === 'all') {
      const revenueData = await getRevenueData(startDate, endDate);
      
      if (reportType === 'all') {
        csvData += 'REVENUE DATA\n';
      }
      
      csvData += 'Date,Revenue (MYR)\n';
      revenueData.forEach(row => {
        csvData += `${row.date},${row.amount.toFixed(2)}\n`;
      });
      
      if (reportType === 'all') {
        csvData += '\n';
        
        csvData += 'REVENUE BY ASSESSMENT TYPE\n';
        csvData += 'Type,Revenue (MYR),Number of Sales\n';
        
        const revenueByType = await getRevenueByType(startDate, endDate);
        revenueByType.forEach(row => {
          csvData += `${row.type},${row.amount.toFixed(2)},${row.count}\n`;
        });
      }
    }
    
    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="analytics-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv"`);
    
    return new Response(csvData, { headers });
  } catch (error) {
    console.error('Error generating analytics report:', error);
    return NextResponse.json(
      { error: 'Failed to generate analytics report' },
      { status: 500 }
    );
  }
}

// Helper function to calculate date range based on selection
function calculateDateRange(
  range: string,
  startDateParam: string | null,
  endDateParam: string | null
) {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();
  
  // Set end time to end of day
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

// Get user data by date
async function getUserData(startDate: Date, endDate: Date) {
  const usersByDateRaw = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('day', "createdAt") as date,
      COUNT(*) as count
    FROM "User"
    WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY date ASC
  `;
  
  return Array.isArray(usersByDateRaw) ? usersByDateRaw.map((item: any) => ({
    date: new Date(item.date).toISOString().split('T')[0],
    count: Number(item.count)
  })) : [];
}

// Get assessment data by date
async function getAssessmentData(startDate: Date, endDate: Date) {
  // Get assessments started by date
  const assessmentsStartedRaw = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('day', "createdAt") as date,
      COUNT(*) as started
    FROM "Assessment"
    WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY date ASC
  `;
  
  const assessmentsStarted = Array.isArray(assessmentsStartedRaw) ? 
    assessmentsStartedRaw.map((item: any) => ({
      date: new Date(item.date).toISOString().split('T')[0],
      started: Number(item.started),
      completed: 0
    })) : [];
  
  // Get assessments completed by date
  const assessmentsCompletedRaw = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('day', "updatedAt") as date,
      COUNT(*) as completed
    FROM "Assessment"
    WHERE 
      "updatedAt" BETWEEN ${startDate} AND ${endDate} AND
      status = 'completed'
    GROUP BY DATE_TRUNC('day', "updatedAt")
    ORDER BY date ASC
  `;
  
  // Merge the data
  const completedMap = new Map();
  if (Array.isArray(assessmentsCompletedRaw)) {
    assessmentsCompletedRaw.forEach((item: any) => {
      completedMap.set(
        new Date(item.date).toISOString().split('T')[0],
        Number(item.completed)
      );
    });
  }
  
  // Update the completed counts in our results
  assessmentsStarted.forEach(item => {
    if (completedMap.has(item.date)) {
      item.completed = completedMap.get(item.date);
    }
  });
  
  // Add any dates that only have completed assessments
  completedMap.forEach((completed, date) => {
    if (!assessmentsStarted.some(item => item.date === date)) {
      assessmentsStarted.push({
        date,
        started: 0,
        completed
      });
    }
  });
  
  // Sort by date
  assessmentsStarted.sort((a, b) => a.date.localeCompare(b.date));
  
  return assessmentsStarted;
}

// Get assessment type statistics
async function getAssessmentTypeData(startDate: Date, endDate: Date) {
  // Get assessment counts by type
  const assessmentsByTypeRaw = await prisma.$queryRaw`
    SELECT 
      type,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM "Assessment"
    WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY type
    ORDER BY total DESC
  `;
  
  return Array.isArray(assessmentsByTypeRaw) ? assessmentsByTypeRaw.map((item: any) => ({
    type: item.type,
    count: Number(item.total),
    completionRate: Number(item.total) > 0 ? Number(item.completed) / Number(item.total) : 0
  })) : [];
}

// Get revenue data by date
async function getRevenueData(startDate: Date, endDate: Date) {
  const revenueByDateRaw = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('day', "createdAt") as date,
      SUM(amount) as amount
    FROM "Payment"
    WHERE 
      status IN ('completed', 'successful', 'paid') AND
      "createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY date ASC
  `;
  
  return Array.isArray(revenueByDateRaw) ? revenueByDateRaw.map((item: any) => ({
    date: new Date(item.date).toISOString().split('T')[0],
    amount: Number(item.amount)
  })) : [];
}

// Get revenue by assessment type
async function getRevenueByType(startDate: Date, endDate: Date) {
  const revenueByTypeRaw = await prisma.$queryRaw`
    SELECT 
      a.type,
      SUM(p.amount) as amount,
      COUNT(p.id) as count
    FROM "Payment" p
    JOIN "Assessment" a ON p."assessmentId" = a.id
    WHERE 
      p.status IN ('completed', 'successful', 'paid') AND
      p."createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY a.type
    ORDER BY amount DESC
  `;
  
  return Array.isArray(revenueByTypeRaw) ? revenueByTypeRaw.map((item: any) => ({
    type: item.type,
    amount: Number(item.amount),
    count: Number(item.count)
  })) : [];
}