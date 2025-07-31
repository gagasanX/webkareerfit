// /src/app/api/admin/assessments/[id]/view/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAdminAuth, logAdminAction } from '@/lib/middleware/adminAuth';
import { logger } from '@/lib/logger';

// ===== TYPES =====
interface AssessmentDetails {
  id: string;
  type: string;
  status: string;
  tier: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null; // Calculated field
  manualProcessing: boolean;
  
  // User details
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  
  // Assessment data
  originalData: any; // User's responses
  processedResults: any; // AI/Manual processing results
  
  // Clerk details (if manual processing)
  assignedClerk: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  
  reviewNotes: string | null;
  reviewedAt: string | null;
  
  // Payment details
  payment: {
    id: string;
    amount: number;
    status: string;
    method: string;
    createdAt: string;
  } | null;
}

// ===== GET: VIEW ASSESSMENT DETAILS =====
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication & Authorization
    const authResult = await validateAdminAuth(request);
    if (!authResult.success) {
      return authResult.error!;
    }

    // 2. Validate assessment ID
    const { id } = params;
    if (!id || typeof id !== 'string' || id.length < 10) {
      return NextResponse.json(
        { error: 'Invalid assessment ID' },
        { status: 400 }
      );
    }

    // 3. Fetch comprehensive assessment details
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true
          }
        },
        assignedClerk: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        payment: {
          select: {
            id: true,
            amount: true,
            status: true,
            method: true,
            createdAt: true
          }
        }
      }
    });

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // 4. Format assessment data based on package type
    const formattedAssessment: AssessmentDetails = {
      id: assessment.id,
      type: assessment.type,
      status: assessment.status,
      tier: assessment.tier,
      price: assessment.price,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
      completedAt: calculateCompletedAt(assessment), // Calculate based on status and reviewedAt
      manualProcessing: assessment.manualProcessing,
      
      user: {
        id: assessment.user.id,
        name: assessment.user.name,
        email: assessment.user.email,
        phone: assessment.user.phone
      },
      
      // Parse assessment data (stored as JSON)
      originalData: parseAssessmentData(assessment.data, 'original'),
      processedResults: parseAssessmentData(assessment.data, 'results'),
      
      assignedClerk: assessment.assignedClerk,
      reviewNotes: assessment.reviewNotes,
      reviewedAt: assessment.reviewedAt?.toISOString() || null,
      
      payment: assessment.payment ? {
        id: assessment.payment.id,
        amount: assessment.payment.amount,
        status: assessment.payment.status,
        method: assessment.payment.method,
        createdAt: assessment.payment.createdAt.toISOString() // Convert Date to string
      } : null
    };

    // 5. Get package-specific analysis
    const packageAnalysis = getPackageAnalysis(assessment.price, formattedAssessment);

    // 6. Log admin action
    await logAdminAction(
      authResult.user!.id,
      'assessment_view',
      {
        assessmentId: id,
        assessmentType: assessment.type,
        packagePrice: assessment.price,
        userId: assessment.user.id
      },
      request
    );

    logger.info('Assessment viewed by admin', {
      assessmentId: id,
      adminId: authResult.user!.id,
      packagePrice: assessment.price
    });

    return NextResponse.json({
      success: true,
      data: {
        assessment: formattedAssessment,
        packageAnalysis
      }
    });

  } catch (error) {
    logger.error('Assessment view error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      assessmentId: params.id
    });

    return NextResponse.json(
      { error: 'Failed to fetch assessment details' },
      { status: 500 }
    );
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Calculate completed date based on status and available data
 */
function calculateCompletedAt(assessment: any): string | null {
  // If status is completed, use reviewedAt if available, otherwise use updatedAt
  if (assessment.status === 'completed') {
    if (assessment.reviewedAt) {
      return assessment.reviewedAt.toISOString();
    }
    // For AI processed assessments, use updatedAt as completion time
    return assessment.updatedAt.toISOString();
  }
  
  // Not completed yet
  return null;
}

/**
 * Parse assessment data from JSON stored in database
 */
function parseAssessmentData(data: any, type: 'original' | 'results'): any {
  if (!data || typeof data !== 'object') {
    return null;
  }

  try {
    if (type === 'original') {
      // Return user's original responses
      return data.responses || data.userResponses || data.answers || null;
    } else {
      // Return processed results
      return data.results || data.analysis || data.processedResults || null;
    }
  } catch (error) {
    logger.warn('Failed to parse assessment data', {
      type,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Get package-specific analysis and features
 */
function getPackageAnalysis(price: number, assessment: AssessmentDetails) {
  const packageInfo = {
    name: '',
    features: [] as string[],
    processingType: '',
    expectedDelivery: '',
    analysisDepth: ''
  };

  switch (price) {
    case 50:
      packageInfo.name = 'Basic Package';
      packageInfo.features = [
        'AI-powered analysis',
        'Core competency assessment',
        'Basic career recommendations',
        'PDF report generation'
      ];
      packageInfo.processingType = 'Automated AI Processing';
      packageInfo.expectedDelivery = 'Immediate (within minutes)';
      packageInfo.analysisDepth = 'Standard analysis with key insights';
      break;

    case 100:
      packageInfo.name = 'Standard Package';
      packageInfo.features = [
        'Manual expert review',
        'Detailed competency analysis',
        'Personalized career roadmap',
        'Industry-specific insights',
        'Expert recommendations',
        'Enhanced PDF report'
      ];
      packageInfo.processingType = 'Manual Clerk Review';
      packageInfo.expectedDelivery = '2-3 business days';
      packageInfo.analysisDepth = 'Comprehensive analysis with expert insights';
      break;

    case 250:
      packageInfo.name = 'Premium Package';
      packageInfo.features = [
        'Senior expert review',
        'In-depth psychological profiling',
        'Detailed career strategy plan',
        'Market trend analysis',
        'Skills gap analysis',
        'Personalized development plan',
        'Video consultation (optional)',
        'Premium detailed report'
      ];
      packageInfo.processingType = 'Senior Expert Review';
      packageInfo.expectedDelivery = '3-5 business days';
      packageInfo.analysisDepth = 'Deep psychological and strategic analysis';
      break;

    default:
      packageInfo.name = 'Custom Package';
      packageInfo.processingType = 'Unknown';
      packageInfo.expectedDelivery = 'Variable';
      packageInfo.analysisDepth = 'Variable';
  }

  return {
    ...packageInfo,
    currentStatus: assessment.status,
    isCompleted: assessment.status === 'completed',
    hasClerkAssigned: !!assessment.assignedClerk,
    clerkName: assessment.assignedClerk?.name || null,
    processingDuration: calculateProcessingDuration(assessment)
  };
}

/**
 * Calculate processing duration
 */
function calculateProcessingDuration(assessment: AssessmentDetails) {
  if (!assessment.completedAt) {
    return null;
  }

  const startTime = new Date(assessment.createdAt);
  const endTime = new Date(assessment.completedAt);
  const durationMs = endTime.getTime() - startTime.getTime();
  
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day(s) ${hours % 24} hour(s)`;
  } else if (hours > 0) {
    return `${hours} hour(s)`;
  } else {
    return 'Less than 1 hour';
  }
}