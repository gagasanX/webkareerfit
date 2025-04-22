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
    
    // Calculate date range
    const { startDate, endDate } = calculateDateRange(range, startDateParam, endDateParam);
    
    // Get user metrics
    const userMetrics = await getUserMetrics(startDate, endDate);
    
    // Get assessment metrics
    const assessmentMetrics = await getAssessmentMetrics(startDate, endDate);
    
    // Get revenue metrics
    const revenueMetrics = await getRevenueMetrics(startDate, endDate);
    
    // Get conversion metrics
    const conversionMetrics = await getConversionMetrics(startDate, endDate);
    
    return NextResponse.json({
      userMetrics,
      assessmentMetrics,
      revenueMetrics,
      conversionMetrics,
      dateRange: {
        start: startDate,
        end: endDate,
        rangeType: range
      }
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
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

// Function to get user metrics
async function getUserMetrics(startDate: Date, endDate: Date) {
  // Get total users
  const totalUsers = await prisma.user.count();
  
  // Get new users today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const newUsersToday = await prisma.user.count({
    where: {
      createdAt: {
        gte: today
      }
    }
  });
  
  // Get new users this week
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const newUsersThisWeek = await prisma.user.count({
    where: {
      createdAt: {
        gte: startOfWeek
      }
    }
  });
  
  // Get new users this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const newUsersThisMonth = await prisma.user.count({
    where: {
      createdAt: {
        gte: startOfMonth
      }
    }
  });
  
  // Get users by date for the selected range
  const usersByDateRaw = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('day', "createdAt") as date,
      COUNT(*) as count
    FROM "User"
    WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY date ASC
  `;
  
  const usersByDate = Array.isArray(usersByDateRaw) ? usersByDateRaw.map((item: any) => ({
    date: new Date(item.date).toISOString().split('T')[0],
    count: Number(item.count)
  })) : [];
  
  // Get users by type
  const regularUsers = await prisma.user.count({
    where: {
      isAdmin: false,
      isClerk: false,
      isAffiliate: false,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const adminUsers = await prisma.user.count({
    where: {
      isAdmin: true,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const clerkUsers = await prisma.user.count({
    where: {
      isClerk: true,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const affiliateUsers = await prisma.user.count({
    where: {
      isAffiliate: true,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const usersByType = [
    { type: 'Regular', count: regularUsers },
    { type: 'Admin', count: adminUsers },
    { type: 'Clerk', count: clerkUsers },
    { type: 'Affiliate', count: affiliateUsers }
  ];
  
  return {
    totalUsers,
    newUsersToday,
    newUsersThisWeek,
    newUsersThisMonth,
    usersByDate,
    usersByType
  };
}

// Function to get assessment metrics
async function getAssessmentMetrics(startDate: Date, endDate: Date) {
  // Get total assessments
  const totalAssessments = await prisma.assessment.count();
  
  // Get assessments created today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const assessmentsToday = await prisma.assessment.count({
    where: {
      createdAt: {
        gte: today
      }
    }
  });
  
  // Get assessments created this week
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const assessmentsThisWeek = await prisma.assessment.count({
    where: {
      createdAt: {
        gte: startOfWeek
      }
    }
  });
  
  // Get assessments created this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const assessmentsThisMonth = await prisma.assessment.count({
    where: {
      createdAt: {
        gte: startOfMonth
      }
    }
  });
  
  // Get completion rate
  const completedAssessments = await prisma.assessment.count({
    where: {
      status: 'completed',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const totalAssessmentsInRange = await prisma.assessment.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const completionRate = totalAssessmentsInRange > 0 
    ? completedAssessments / totalAssessmentsInRange
    : 0;
  
  // Get assessments by date for the selected range
  const assessmentsByDateRaw = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('day', "createdAt") as date,
      COUNT(*) as count
    FROM "Assessment"
    WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY date ASC
  `;
  
  const assessmentsByDate = Array.isArray(assessmentsByDateRaw) ? assessmentsByDateRaw.map((item: any) => ({
    date: new Date(item.date).toISOString().split('T')[0],
    count: Number(item.count)
  })) : [];
  
  // Get assessments by type
  const assessmentsByTypeRaw = await prisma.$queryRaw`
    SELECT 
      type,
      COUNT(*) as count
    FROM "Assessment"
    WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY type
    ORDER BY count DESC
  `;
  
  const assessmentsByType = Array.isArray(assessmentsByTypeRaw) ? assessmentsByTypeRaw.map((item: any) => ({
    type: item.type,
    count: Number(item.count)
  })) : [];
  
  return {
    totalAssessments,
    assessmentsToday,
    assessmentsThisWeek,
    assessmentsThisMonth,
    completionRate,
    assessmentsByDate,
    assessmentsByType
  };
}

// Function to get revenue metrics
async function getRevenueMetrics(startDate: Date, endDate: Date) {
  // Get total revenue (all time)
  const totalRevenueResult = await prisma.payment.aggregate({
    _sum: {
      amount: true
    },
    where: {
      status: {
        in: ['completed', 'successful', 'paid']
      }
    }
  });
  
  const totalRevenue = totalRevenueResult._sum.amount || 0;
  
  // Get revenue today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRevenueResult = await prisma.payment.aggregate({
    _sum: {
      amount: true
    },
    where: {
      status: {
        in: ['completed', 'successful', 'paid']
      },
      createdAt: {
        gte: today
      }
    }
  });
  
  const revenueToday = todayRevenueResult._sum.amount || 0;
  
  // Get revenue this week
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const weekRevenueResult = await prisma.payment.aggregate({
    _sum: {
      amount: true
    },
    where: {
      status: {
        in: ['completed', 'successful', 'paid']
      },
      createdAt: {
        gte: startOfWeek
      }
    }
  });
  
  const revenueThisWeek = weekRevenueResult._sum.amount || 0;
  
  // Get revenue this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthRevenueResult = await prisma.payment.aggregate({
    _sum: {
      amount: true
    },
    where: {
      status: {
        in: ['completed', 'successful', 'paid']
      },
      createdAt: {
        gte: startOfMonth
      }
    }
  });
  
  const revenueThisMonth = monthRevenueResult._sum.amount || 0;
  
  // Calculate average order value
  const completedPaymentsCount = await prisma.payment.count({
    where: {
      status: {
        in: ['completed', 'successful', 'paid']
      },
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const totalRevenueInRangeResult = await prisma.payment.aggregate({
    _sum: {
      amount: true
    },
    where: {
      status: {
        in: ['completed', 'successful', 'paid']
      },
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const totalRevenueInRange = totalRevenueInRangeResult._sum.amount || 0;
  const averageOrderValue = completedPaymentsCount > 0 
    ? totalRevenueInRange / completedPaymentsCount
    : 0;
  
  // Get revenue by date for selected range
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
  
  const revenueByDate = Array.isArray(revenueByDateRaw) ? revenueByDateRaw.map((item: any) => ({
    date: new Date(item.date).toISOString().split('T')[0],
    amount: Number(item.amount)
  })) : [];
  
  // Get revenue by assessment type
  const revenueByAssessmentTypeRaw = await prisma.$queryRaw`
    SELECT 
      a.type,
      SUM(p.amount) as amount
    FROM "Payment" p
    JOIN "Assessment" a ON p."assessmentId" = a.id
    WHERE 
      p.status IN ('completed', 'successful', 'paid') AND
      p."createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY a.type
    ORDER BY amount DESC
  `;
  
  const revenueByAssessmentType = Array.isArray(revenueByAssessmentTypeRaw) ? revenueByAssessmentTypeRaw.map((item: any) => ({
    type: item.type,
    amount: Number(item.amount)
  })) : [];
  
  return {
    totalRevenue,
    revenueToday,
    revenueThisWeek,
    revenueThisMonth,
    averageOrderValue,
    revenueByDate,
    revenueByAssessmentType
  };
}

// Function to get conversion metrics
async function getConversionMetrics(startDate: Date, endDate: Date) {
  // Count total visitors (users created)
  const totalVisitors = await prisma.user.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  // Count users who started an assessment
  const usersWithAssessments = await prisma.assessment.groupBy({
    by: ['userId'],
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const startedAssessmentUsers = usersWithAssessments.length;
  
  // Count users who completed an assessment
  const usersWithCompletedAssessments = await prisma.assessment.groupBy({
    by: ['userId'],
    where: {
      status: 'completed',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const completedAssessmentUsers = usersWithCompletedAssessments.length;
  
  // Count users who made a payment
  const usersWithPayments = await prisma.payment.groupBy({
    by: ['userId'],
    where: {
      status: {
        in: ['completed', 'successful', 'paid']
      },
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  const paidUsers = usersWithPayments.length;
  
  // Calculate global conversion rate
  const globalConversionRate = totalVisitors > 0 ? paidUsers / totalVisitors : 0;
  
  // Calculate abandonment rate (started but didn't complete)
  const abandonmentRate = startedAssessmentUsers > 0 
    ? (startedAssessmentUsers - completedAssessmentUsers) / startedAssessmentUsers
    : 0;
  
  // Create conversion funnel data
  const conversionFunnel = [
    { stage: 'Visitors', count: totalVisitors, rate: 1 },
    { stage: 'Started Assessment', count: startedAssessmentUsers, rate: totalVisitors > 0 ? startedAssessmentUsers / totalVisitors : 0 },
    { stage: 'Completed Assessment', count: completedAssessmentUsers, rate: totalVisitors > 0 ? completedAssessmentUsers / totalVisitors : 0 },
    { stage: 'Made Payment', count: paidUsers, rate: totalVisitors > 0 ? paidUsers / totalVisitors : 0 }
  ];
  
  // Placeholder for conversion by source (would need referral tracking)
  // In a real application, this would come from actual referral or UTM data
  const conversionBySource = [
    { source: 'Direct', rate: 0.15, count: Math.floor(totalVisitors * 0.4) },
    { source: 'Organic Search', rate: 0.08, count: Math.floor(totalVisitors * 0.25) },
    { source: 'Referral', rate: 0.12, count: Math.floor(totalVisitors * 0.15) },
    { source: 'Social Media', rate: 0.05, count: Math.floor(totalVisitors * 0.1) },
    { source: 'Email', rate: 0.18, count: Math.floor(totalVisitors * 0.05) },
    { source: 'Affiliate', rate: 0.10, count: Math.floor(totalVisitors * 0.05) }
  ];
  
  return {
    globalConversionRate,
    conversionBySource,
    conversionFunnel,
    abandonmentRate
  };
}