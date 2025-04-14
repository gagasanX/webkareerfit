
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check user authentication and clerk permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure user has clerk or admin role
    if (session.user.role !== 'CLERK' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // Get all assessments for stats
    const assessments = await prisma.assessment.findMany({
      select: {
        id: true,
        type: true,
        status: true,
        price: true,
        createdAt: true,
      },
    });
    
    // Calculate total assessments
    const totalAssessments = assessments.length;
    
    // Calculate total revenue
    const totalRevenue = assessments.reduce((sum, assessment) => sum + assessment.price, 0);
    
    // Calculate average price
    const averagePrice = totalAssessments > 0 ? totalRevenue / totalAssessments : 0;
    
    // Group by assessment type
    const typeStats = Object.entries(
      assessments.reduce((acc, assessment) => {
        acc[assessment.type] = (acc[assessment.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([type, count]) => ({ type, count }));
    
    // Group by status
    const statusStats = Object.entries(
      assessments.reduce((acc, assessment) => {
        acc[assessment.status] = (acc[assessment.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([status, count]) => ({ status, count }));
    
    // Group by month for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1); // Start of month
    
    // Create array of last 6 months
    const lastSixMonths = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        date: new Date(date.getFullYear(), date.getMonth(), 1),
      };
    }).reverse();
    
    // Calculate monthly stats
    const monthlyStats = lastSixMonths.map(({ month, date }) => {
      const nextMonth = new Date(date);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const monthAssessments = assessments.filter(
        assessment => {
          const createdAt = new Date(assessment.createdAt);
          return createdAt >= date && createdAt < nextMonth;
        }
      );
      
      const assessmentCount = monthAssessments.length;
      const revenue = monthAssessments.reduce((sum, assessment) => sum + assessment.price, 0);
      
      return {
        month,
        assessments: assessmentCount,
        revenue,
      };
    });
    
    return NextResponse.json({
      totalAssessments,
      totalRevenue,
      averagePrice,
      typeStats,
      statusStats,
      monthlyStats,
    });
  } catch (error) {
    console.error('Error fetching reports data:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching reports data' },
      { status: 500 }
    );
  }
}