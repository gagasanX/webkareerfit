'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AssessmentProcessingScreen from '@/components/assessment/AssessmentProcessingScreen';

// ENHANCED: Recommendation interface with additional fields
interface RecommendationWithDetails {
  title: string;
  explanation: string;
  steps: string[];
  timeframe?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  successMetrics?: string[];
}

// ENHANCED: Resume Analysis interface
interface ResumeAnalysis {
  analysis: string;
  keyFindings: string[];
  experienceLevel: 'ENTRY' | 'JUNIOR' | 'MID' | 'SENIOR' | 'EXECUTIVE' | 'UNKNOWN';
  skillsValidation: {
    claimed: string[];
    evidenced: string[];
    missing: string[];
  };
  gapAnalysis: string[];
  credibilityScore: number;
  recommendations: string[];
}

// ENHANCED: Career Fit interface
interface CareerFit {
  fitLevel: 'EXCELLENT_FIT' | 'GOOD_FIT' | 'PARTIAL_FIT' | 'POOR_FIT' | 'WRONG_CAREER_PATH';
  fitPercentage: number;
  honestAssessment: string;
  realityCheck: string;
  marketCompetitiveness: string;
  timeToReadiness: string;
  criticalGaps: string[];
  competitiveAdvantages: string[];
}

// OPTIMIZED: Clean scores interface
interface ScoresData {
  [key: string]: number;
  overallScore: number;
}

// Enhanced assessment data interface
interface AssessmentData {
  scores: ScoresData;
  readinessLevel: string;
  recommendations: RecommendationWithDetails[];
  summary: string;
  strengths: string[];
  improvements: string[];
  resumeAnalysis?: ResumeAnalysis;
  careerFit?: CareerFit;
  
  // Top level fields
  resumeConsistency?: number;
  evidenceLevel?: 'STRONG' | 'MODERATE' | 'WEAK' | 'INSUFFICIENT';
  
  // 🔥 NEW: Personal info fields
  personalInfo?: {
    name: string;
    email: string;
    phone: string;
    personality: string[];
    jobPosition: string;
  };
  qualification?: string;
  
  categoryAnalysis?: Record<string, {
    score: number;
    strengths: string[];
    improvements: string[];
  }>;
  answers?: Record<string, any>;
  completedAt?: string;
  submittedAt?: string;
  resumeText?: string;
  aiProcessed?: boolean;
  aiProcessedAt?: string;
  aiAnalysisStarted?: boolean;
  aiAnalysisStartedAt?: string;
  aiError?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  redirectRequired?: boolean;
  manualProcessingOnly?: boolean;
  properRedirectUrl?: string;
  showProcessingScreen?: boolean;
  processingMessage?: string;
}

interface ResultsClientProps {
  assessmentType: string;
  assessmentId: string;
}

export function ResultsClient({ assessmentType, assessmentId }: ResultsClientProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assessment, setAssessment] = useState<any>(null);
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [aiStatus, setAiStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [manualStatus, setManualStatus] = useState<'pending_review' | 'in_review' | 'completed' | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [showProcessingScreen, setShowProcessingScreen] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  // Assessment type labels
  const assessmentTypeLabels: Record<string, string> = {
    fjrl: 'First Job Readiness Level',
    ijrl: 'Ideal Job Readiness Level',
    cdrl: 'Career Development Readiness Level',
    ccrl: 'Career Comeback Readiness Level',
    ctrl: 'Career Transition Readiness Level',
    rrl: 'Retirement Readiness Level',
    irl: 'Internship Readiness Level',
  };

  // Category display mapping
  const categoryDisplayMap: { [key: string]: string } = {
    skillCurrency: 'Skill Renewal',
    marketKnowledge: 'Market Knowledge',
    confidenceLevel: 'Confidence Readiness',
    networkStrength: 'Networking Relationships',
    technicalSkills: 'Technical Skills',
    jobMarketAwareness: 'Job Market Awareness',
    professionalPresentation: 'Professional Presentation',
    interviewPreparation: 'Interview Preparedness',
    careerGoalClarity: 'Career Goal Clarity',
    qualificationGap: 'Qualification Gap',
    industryKnowledge: 'Industry Knowledge',
    networkDevelopment: 'Network Development',
    leadershipPotential: 'Leadership Potential',
    strategicThinking: 'Strategic Thinking',
    domainExpertise: 'Domain Expertise',
    changeManagement: 'Change Management',
    transferableSkills: 'Transferable Skills',
    targetIndustryKnowledge: 'Target Industry Knowledge',
    adaptability: 'Adaptability',
    transitionStrategy: 'Transition Strategy',
    financialPreparation: 'Financial Preparation',
    psychologicalReadiness: 'Psychological Readiness',
    postRetirementPlan: 'Post-Retirement Plan',
    knowledgeTransfer: 'Knowledge Transfer',
    academicPreparation: 'Academic Preparation',
    professionalAwareness: 'Professional Awareness',
    practicalExperience: 'Practical Experience',
    learningOrientation: 'Learning Orientation',
    careerPlanning: 'Career Planning',
    skillsDevelopment: 'Skills Development',
    professionalNetworking: 'Professional Networking'
  };

  // 🔥 NEW: Helper functions to extract user data
  const getUserName = (): string => {
    // Priority: 1. Assessment form data, 2. Session data, 3. Default
    return assessment?.submission?.personalInfo?.name || 
           assessment?.data?.personalInfo?.name ||
           assessmentData?.personalInfo?.name ||
           session?.user?.name || 
           '';
  };

  const getUserEmail = (): string => {
    // Priority: 1. Assessment form data, 2. Session data, 3. Default  
    return assessment?.submission?.personalInfo?.email ||
           assessment?.data?.personalInfo?.email ||
           assessmentData?.personalInfo?.email ||
           session?.user?.email || 
           '';
  };

  const getUserTargetPosition = (): string => {
    // Get target job position from assessment data
    return assessment?.submission?.personalInfo?.jobPosition ||
           assessment?.data?.personalInfo?.jobPosition ||
           assessmentData?.personalInfo?.jobPosition ||
           '';
  };

  const getUserQualification = (): string => {
    // Get highest qualification from assessment data
    return assessment?.submission?.qualification ||
           assessment?.data?.qualification ||
           assessmentData?.qualification ||
           '';
  };

  const getUserInitials = (): string => {
    const name = getUserName();
    if (!name) return '👤';
    
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getUserPersonalities = (): string[] => {
    // Get selected personality types
    const personalities = assessment?.submission?.personalInfo?.personality ||
                         assessment?.data?.personalInfo?.personality ||
                         assessmentData?.personalInfo?.personality ||
                         [];
    
    return Array.isArray(personalities) ? personalities : [];
  };

  // Authentication and initial fetch
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/assessment/${assessmentType}/results/${assessmentId}`);
      return;
    }

    if (status === 'authenticated' && assessmentType && assessmentId) {
      fetchResults();
    }
  }, [status, assessmentType, assessmentId, router]);

  // Auto-redirect for manual processing assessments
  useEffect(() => {
    if (assessment && assessmentData) {
      const isManualProcessing = assessment.tier === 'standard' || 
                                assessment.tier === 'premium' || 
                                assessment.manualProcessing === true;
      
      const redirectRequired = assessmentData.redirectRequired === true || 
                              assessmentData.manualProcessingOnly === true;
      
      const hasOnlyPlaceholderResults = !assessmentData.scores ||
                                       Object.keys(assessmentData.scores).length <= 1 ||
                                       assessmentData.manualProcessingOnly;
      
      if (isManualProcessing && (redirectRequired || hasOnlyPlaceholderResults)) {
        let redirectUrl: string;
        if (assessment.tier === 'premium') {
          redirectUrl = `/assessment/${assessmentType}/premium-results/${assessmentId}`;
        } else if (assessment.tier === 'standard') {
          redirectUrl = `/assessment/${assessmentType}/standard-results/${assessmentId}`;
        } else {
          return;
        }
        
        router.replace(redirectUrl);
        return;
      }
    }
  }, [assessment, assessmentData, router, assessmentType, assessmentId]);

  // Enhanced polling for processing screen and AI updates
  useEffect(() => {
    if (showProcessingScreen || 
        (assessmentData && assessmentData.aiAnalysisStarted && !assessmentData.aiProcessed && pollingCount < 30)) {
      
      const pollInterval = Math.min(10000, 3000 + (pollingCount * 1000));
      
      const timer = setTimeout(() => {
        fetchResults();
        setPollingCount(prev => prev + 1);
      }, pollInterval);
      
      return () => clearTimeout(timer);
    }
  }, [showProcessingScreen, assessmentData, pollingCount]);

  // 🔥 FIXED & ENHANCED: fetchResults function with robust data normalization
  const fetchResults = async () => {
    if (!assessmentType || !assessmentId) {
      setError('Missing assessment type or ID');
      return;
    }
    
    try {
      const now = new Date().getTime();
      const response = await fetch(`/api/assessment/${assessmentType}/results/${assessmentId}?_nocache=${now}`);
      
      if (!response.ok) {
        let errorMessage = 'Failed to fetch assessment results';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setAssessment(data);
      
      const isManualProcessing = data.manualProcessing || 
                                data.tier === 'standard' || 
                                data.tier === 'premium';
      
      if (isManualProcessing) {
        setManualStatus(data.status as 'pending_review' | 'in_review' | 'completed' | null);
        
        if (data.status === 'completed') {
          setAiStatus('completed');
        } else {
          setAiStatus('pending');
        }
      }
      
      const responseData = data.data || {};
      
      const aiProcessed = responseData.aiProcessed || false;
      const aiAnalysisStarted = responseData.aiAnalysisStarted || false;
      const aiError = responseData.aiError;
      const showProcessingScreenFlag = responseData.showProcessingScreen === true;
      
      const shouldShowProcessing = !isManualProcessing && (
        showProcessingScreenFlag || 
        (!aiProcessed && aiAnalysisStarted && !aiError)
      );
      
      if (shouldShowProcessing) {
        setShowProcessingScreen(true);
        setProcessingMessage(
          responseData.processingMessage || 
          (aiAnalysisStarted ? 'AI analysis in progress...' : 'Starting AI analysis...')
        );
        setLoading(false);
        setPollingCount(prev => prev === 0 ? 0 : prev);
        setAiStatus('processing');
        return;
      }
      
      setShowProcessingScreen(false);
      setProcessingMessage('');
      
      if (!isManualProcessing && !aiProcessed && !aiError) {
        setLoading(false);
        setAiStatus('pending');
        return;
      }
      
      let scoresObj = { overallScore: 70 } as ScoresData;
      if (responseData.scores && typeof responseData.scores === 'object') {
        Object.entries(responseData.scores).forEach(([key, value]) => {
          if (typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 100) {
            scoresObj[key] = value;
          } else if (value !== undefined) {
            const numValue = Number(value);
            if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
              scoresObj[key] = numValue;
            }
          }
        });
      }

      if (!scoresObj.hasOwnProperty('overallScore') || typeof scoresObj.overallScore !== 'number' || isNaN(scoresObj.overallScore)) {
        const categoryScores = Object.values(scoresObj).filter(v => typeof v === 'number');
        if (categoryScores.length > 0) {
          scoresObj.overallScore = Math.round(
            categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length
          );
        }
      }
      scoresObj.overallScore = Math.round(scoresObj.overallScore);

      const normalizedRecommendations = normalizeRecommendations(responseData.recommendations);
      
      let readinessLevel = responseData.readinessLevel || calculateReadinessLevel(scoresObj.overallScore);

      // 🔥 FIX: Normalize complex nested objects to prevent crashes
      const normalizedResumeAnalysis = responseData.resumeAnalysis ? {
        analysis: responseData.resumeAnalysis.analysis || '',
        keyFindings: Array.isArray(responseData.resumeAnalysis.keyFindings) ? responseData.resumeAnalysis.keyFindings : [],
        experienceLevel: responseData.resumeAnalysis.experienceLevel || 'UNKNOWN',
        skillsValidation: {
          claimed: Array.isArray(responseData.resumeAnalysis.skillsValidation?.claimed) ? responseData.resumeAnalysis.skillsValidation.claimed : [],
          evidenced: Array.isArray(responseData.resumeAnalysis.skillsValidation?.evidenced) ? responseData.resumeAnalysis.skillsValidation.evidenced : [],
          missing: Array.isArray(responseData.resumeAnalysis.skillsValidation?.missing) ? responseData.resumeAnalysis.skillsValidation.missing : [],
        },
        gapAnalysis: Array.isArray(responseData.resumeAnalysis.gapAnalysis) ? responseData.resumeAnalysis.gapAnalysis : [],
        credibilityScore: typeof responseData.resumeAnalysis.credibilityScore === 'number' ? responseData.resumeAnalysis.credibilityScore : 0,
        recommendations: Array.isArray(responseData.resumeAnalysis.recommendations) ? responseData.resumeAnalysis.recommendations : [],
      } : undefined;

      const normalizedCareerFit = responseData.careerFit ? {
        ...responseData.careerFit,
        criticalGaps: Array.isArray(responseData.careerFit.criticalGaps) ? responseData.careerFit.criticalGaps : [],
        competitiveAdvantages: Array.isArray(responseData.careerFit.competitiveAdvantages) ? responseData.careerFit.competitiveAdvantages : [],
      } : undefined;
      
      const processedData: AssessmentData = {
        scores: scoresObj,
        readinessLevel: readinessLevel,
        recommendations: normalizedRecommendations,
        summary: responseData.summary || 'Assessment completed. This provides insights into your current career readiness.',
        strengths: Array.isArray(responseData.strengths) ? responseData.strengths : ["Completed comprehensive career assessment"],
        improvements: Array.isArray(responseData.improvements) ? responseData.improvements : ["Continue developing your skills and knowledge"],
        resumeAnalysis: normalizedResumeAnalysis,
        careerFit: normalizedCareerFit,
        resumeConsistency: responseData.resumeConsistency,
        evidenceLevel: responseData.evidenceLevel,
        personalInfo: responseData.personalInfo || data.submission?.personalInfo,
        qualification: responseData.qualification || data.submission?.qualification,
        categoryAnalysis: responseData.categoryAnalysis,
        completedAt: responseData.completedAt || data.completedAt || new Date().toISOString(),
        submittedAt: responseData.submittedAt || data.createdAt || new Date().toISOString(),
        resumeText: responseData.resumeText,
        aiProcessed: responseData.aiProcessed || false,
        aiAnalysisStarted: aiAnalysisStarted,
        aiAnalysisStartedAt: responseData.aiAnalysisStartedAt,
        aiProcessedAt: responseData.aiProcessedAt,
        aiError: responseData.aiError,
        reviewNotes: data.reviewNotes,
        reviewedAt: data.reviewedAt,
        redirectRequired: responseData.redirectRequired,
        manualProcessingOnly: responseData.manualProcessingOnly,
        properRedirectUrl: responseData.properRedirectUrl,
        showProcessingScreen: shouldShowProcessing,
        processingMessage: responseData.processingMessage,
      };
      
      if (processedData.aiProcessed) setAiStatus('completed');
      else if (processedData.aiAnalysisStarted && !processedData.aiError) setAiStatus('processing');
      else if (processedData.aiError) setAiStatus('failed');
      else setAiStatus('pending');
      
      setAssessmentData(processedData);
      setLoading(false);
      setError('');
      
    } catch (err) {
      console.error('Error fetching assessment results:', err);
      setError(err instanceof Error ? err.message : 'Error loading assessment results. Please try again.');
      setLoading(false);
      setShowProcessingScreen(false);
      setAiStatus('failed');
    }
  };

  const handleProcessingComplete = () => {
    setShowProcessingScreen(false);
    setPollingCount(0);
    fetchResults();
  };

  const normalizeRecommendations = (recommendations: any): RecommendationWithDetails[] => {
    if (!Array.isArray(recommendations)) return [];
    
    return recommendations.map(rec => {
      if (rec && typeof rec === 'object' && rec.title && rec.explanation && Array.isArray(rec.steps)) {
        return {
          title: rec.title,
          explanation: rec.explanation,
          steps: rec.steps,
          timeframe: rec.timeframe || '1-3 months',
          priority: rec.priority || 'MEDIUM',
          successMetrics: Array.isArray(rec.successMetrics) ? rec.successMetrics : []
        } as RecommendationWithDetails;
      } else if (typeof rec === 'string') {
        return {
          title: rec,
          explanation: "This recommendation will help you develop essential skills for your career advancement.",
          steps: ["Research resources...", "Create a specific action plan...", "Track your progress..."],
          timeframe: '1-3 months', priority: 'MEDIUM', successMetrics: []
        };
      }
      return {
        title: "Enhance Your Career Development",
        explanation: "Focusing on continuous improvement is essential for career growth.",
        steps: ["Identify specific skills...", "Find appropriate resources...", "Practice and apply..."],
        timeframe: '1-3 months', priority: 'MEDIUM', successMetrics: []
      };
    });
  };

  const calculateReadinessLevel = (score: number): string => {
    if (score < 50) return "Early Development";
    if (score < 70) return "Developing Competency";
    if (score < 85) return "Approaching Readiness";
    return "Fully Prepared";
  };

  const handleRefreshResults = () => { setLoading(true); fetchResults(); };

  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    if (percentage >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getReadinessLevelColor = (level: string): string => {
    switch (level) {
      case "Early Development": return "text-red-600";
      case "Developing Competency": return "text-yellow-600";
      case "Approaching Readiness": return "text-blue-600";
      case "Fully Prepared": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  const getFitLevelColor = (fitLevel: string): string => {
    switch (fitLevel) {
      case 'EXCELLENT_FIT': return 'border-green-500 bg-green-50';
      case 'GOOD_FIT': return 'border-blue-500 bg-blue-50';
      case 'PARTIAL_FIT': return 'border-yellow-500 bg-yellow-50';
      case 'POOR_FIT': return 'border-orange-500 bg-orange-50';
      case 'WRONG_CAREER_PATH': return 'border-red-500 bg-red-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getFitLevelBadge = (fitLevel: string): string => {
    switch (fitLevel) {
      case 'EXCELLENT_FIT': return 'bg-green-200 text-green-800';
      case 'GOOD_FIT': return 'bg-blue-200 text-blue-800';
      case 'PARTIAL_FIT': return 'bg-yellow-200 text-yellow-800';
      case 'POOR_FIT': return 'bg-orange-200 text-orange-800';
      case 'WRONG_CAREER_PATH': return 'bg-red-200 text-red-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const getFitLevelLabel = (fitLevel: string): string => {
    switch (fitLevel) {
      case 'EXCELLENT_FIT': return 'Excellent Match';
      case 'GOOD_FIT': return 'Strong Potential';
      case 'PARTIAL_FIT': return 'Some Gaps Exist';
      case 'POOR_FIT': return 'Needs Major Development';
      case 'WRONG_CAREER_PATH': return 'Consider Different Path';
      default: return 'Assessment Needed';
    }
  };

  // 🔥 FIXED & ENHANCED: handlePrint function is now crash-proof
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website to download your results.');
      return;
    }
    
    const overallScore = assessmentData?.scores?.overallScore ?? 70;
    const userName = getUserName();
    const userEmail = getUserEmail();
    const targetPosition = getUserTargetPosition();
    const qualification = getUserQualification();
    const personalities = getUserPersonalities();
    
    const userInfoHTML = `
      <div class="user-info-section section">
        <h2>Participant Information</h2>
        <div class="user-details">
          <div class="user-detail-row"><strong>Name:</strong> ${userName || 'Not provided'}</div>
          <div class="user-detail-row"><strong>Email:</strong> ${userEmail || 'Not provided'}</div>
          ${targetPosition ? `<div class="user-detail-row"><strong>Target Position:</strong> ${targetPosition}</div>` : ''}
          ${qualification ? `<div class="user-detail-row"><strong>Highest Qualification:</strong> ${qualification}</div>` : ''}
          ${personalities.length > 0 ? `
            <div class="user-detail-row">
              <strong>Personality Types:</strong> 
              <div class="personality-tags">
                ${personalities.map(p => `<span class="personality-tag">${p.split(' - ')[0]}</span>`).join('')}
              </div>
            </div>` : ''}
        </div>
      </div>`;
    
    const categoryScoresHTML = assessmentData?.scores 
      ? Object.entries(assessmentData.scores)
          .filter(([key]) => key !== 'overallScore')
          .map(([category, score]) => {
            const scoreValue = typeof score === 'number' ? Math.round(score) : 0;
            const scoreColor = getScoreColor(scoreValue).replace('bg-', ''); // simple color name
            const displayName = categoryDisplayMap[category] || formatCategoryName(category);
            return `<div class="score-row">
                <div class="score-label"><span>${displayName}</span><span>${scoreValue}%</span></div>
                <div class="score-bar-container"><div class="score-bar" style="width: ${scoreValue}%; background-color: ${scoreColor};"></div></div>
              </div>`;
          }).join('') 
      : '<p>No detailed category scores available</p>';

    const resumeAnalysisHTML = assessmentData?.resumeAnalysis ? `
      <div class="section">
        <h2>Resume Analysis</h2>
        <div class="resume-quality">
          <div class="flex items-center justify-between">
            <h3>Resume Quality Assessment</h3>
            <div class="credibility-score">
              <span class="score">${assessmentData.resumeAnalysis.credibilityScore}%</span>
              <span class="level">${assessmentData.resumeAnalysis.experienceLevel}</span>
            </div>
          </div>
          <p>${assessmentData.resumeAnalysis.analysis}</p>
          ${assessmentData.resumeAnalysis.keyFindings?.length > 0 ? `
            <div class="key-findings"><h4>Key Findings:</h4><ul>${assessmentData.resumeAnalysis.keyFindings.map(finding => `<li>${finding}</li>`).join('')}</ul></div>` : ''}
          ${assessmentData.resumeAnalysis.gapAnalysis?.length > 0 ? `
            <div class="gap-analysis"><h4>Gap Analysis:</h4><ul>${assessmentData.resumeAnalysis.gapAnalysis.map(gap => `<li>${gap}</li>`).join('')}</ul></div>` : ''}
        </div>
      </div>` : '';

    const careerFitHTML = assessmentData?.careerFit ? `
      <div class="section">
        <h2>Career Fit Analysis</h2>
        <div class="career-fit">
          <div class="fit-header">
            <h3>Fit Level: ${assessmentData.careerFit.fitLevel.replace(/_/g, ' ')}</h3>
            <div class="fit-percentage">${assessmentData.careerFit.fitPercentage}% Match</div>
          </div>
          <div class="honest-assessment"><h4>Honest Assessment:</h4><p>${assessmentData.careerFit.honestAssessment}</p></div>
          <div class="reality-check"><h4>Reality Check:</h4><p>${assessmentData.careerFit.realityCheck}</p></div>
          <div class="market-info">
            <div><h4>Market Competitiveness:</h4><p>${assessmentData.careerFit.marketCompetitiveness}</p></div>
            <div><h4>Time to Full Readiness:</h4><p>${assessmentData.careerFit.timeToReadiness}</p></div>
          </div>
          ${assessmentData.careerFit.criticalGaps?.length > 0 ? `
            <div class="critical-gaps"><h4>Critical Gaps to Address:</h4><ul>${assessmentData.careerFit.criticalGaps.map(gap => `<li>${gap}</li>`).join('')}</ul></div>` : ''}
        </div>
      </div>` : '';
    
    const contentToPrint = `
      <!DOCTYPE html><html><head><title>Enhanced Assessment Results - ${assessmentTypeLabels[assessmentType] || assessmentType}</title><meta charset="utf-8"><style>
          body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; padding: 20px; max-width: 1000px; margin: 0 auto; }
          .header { background-color: #5a67d8; color: white; padding: 20px; margin-bottom: 20px; border-radius: 10px; }
          .section { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 10px; break-inside: avoid; }
          h1, h2, h3, h4 { margin: 0 0 10px 0; } h1 { font-size: 24px; } h2 { font-size: 20px; color: #4a5568; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; } h3 { font-size: 18px; color: #2d3748; } h4 { font-size: 16px; color: #4a5568; }
          .score-circle { width: 100px; height: 100px; border-radius: 50%; background-color: #f7fafc; border: 10px solid ${getScoreColor(overallScore).replace('bg-', '')}; display: flex; justify-content: center; align-items: center; font-size: 24px; font-weight: bold; margin-right: 20px; }
          .score-container { display: flex; align-items: center; margin-bottom: 15px; }
          .score-info { flex: 1; } .readiness-level { font-weight: bold; font-size: 20px; margin: 10px 0; }
          .two-columns { display: flex; gap: 20px; } .column { flex: 1; padding: 15px; border-radius: 10px; }
          .strengths { background-color: #f0fff4; border: 1px solid #c6f6d5; } .improvements { background-color: #fffbeb; border: 1px solid #feebc8; }
          .score-row { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #edf2f7; }
          .score-label { display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: 500; }
          .score-bar-container { height: 8px; background-color: #edf2f7; border-radius: 4px; overflow: hidden; } .score-bar { height: 100%; border-radius: 4px; }
          ul, ol { margin-top: 5px; padding-left: 25px; margin-bottom: 10px; } li { margin-bottom: 5px; }
          .recommendation { background-color: #ebf8ff; border: 1px solid #bee3f8; border-radius: 10px; padding: 15px; margin-bottom: 20px; break-inside: avoid; }
          .recommendation-title { font-size: 18px; font-weight: bold; color: #2b6cb0; margin-bottom: 10px; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; text-align: center; }
          .career-fit, .resume-quality { background-color: #f8f9fa; padding: 15px; border-radius: 8px; }
          .fit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; } .fit-percentage { font-size: 24px; font-weight: bold; }
          .market-info { display: flex; gap: 20px; margin-top: 15px; } .market-info > div { flex: 1; }
          .user-info-section { background-color: #f8fafc; border: 1px solid #e2e8f0; }
          .user-detail-row { margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #e2e8f0; } .user-detail-row:last-child { border-bottom: none; }
          .personality-tag { display: inline-block; background-color: #e6fffa; color: #234e52; padding: 2px 8px; margin: 2px; border-radius: 12px; font-size: 12px; }
      </style></head><body>
        <div class="header"><h1>${assessmentTypeLabels[assessmentType] || assessmentType} Results</h1><p>Completed on ${new Date(assessmentData?.completedAt || new Date()).toLocaleDateString()}</p></div>
        ${userInfoHTML}
        <div class="section"><h2>Overall Score</h2><div class="score-container"><div class="score-circle">${Math.round(overallScore)}%</div><div class="score-info"><div class="readiness-level">Readiness Level: ${assessmentData?.readinessLevel || 'Not Available'}</div><div>${assessmentData?.summary || 'Assessment completed successfully.'}</div></div></div></div>
        ${careerFitHTML}
        ${resumeAnalysisHTML}
        <div class="section"><h2>Key Insights</h2><div class="two-columns">
            <div class="column strengths"><h3>Your Strengths</h3><ul>${assessmentData?.strengths?.map(s => `<li>${s}</li>`).join('') || '<li>-</li>'}</ul></div>
            <div class="column improvements"><h3>Areas for Improvement</h3><ul>${assessmentData?.improvements?.map(i => `<li>${i}</li>`).join('') || '<li>-</li>'}</ul></div>
        </div></div>
        <div class="section"><h2>Category Scores</h2>${categoryScoresHTML}</div>
        <div class="section"><h2>Action Plan & Recommendations</h2>${assessmentData?.recommendations?.map((rec, index) => `
            <div class="recommendation">
              <div class="recommendation-title">${index + 1}. ${rec.title}</div>
              <div>${rec.explanation}</div>
              ${rec.timeframe ? `<div><strong>Timeframe:</strong> ${rec.timeframe}</div>` : ''}
              ${rec.priority ? `<div><strong>Priority:</strong> ${rec.priority}</div>` : ''}
              <div style="background-color: white; padding: 10px; border-radius: 5px; margin-top:10px;">
                <h3 style="margin-top: 0;">Implementation Steps:</h3>
                <ol>${rec.steps.map(step => `<li>${step}</li>`).join('')}</ol>
                ${rec.successMetrics && rec.successMetrics.length > 0 ? `<h4>Success Metrics:</h4><ul>${rec.successMetrics.map(m => `<li>${m}</li>`).join('')}</ul>` : ''}
              </div>
            </div>`).join('') || '<p>No specific recommendations available</p>'}
        </div>
        <div class="footer"><p>This report was generated on ${new Date().toLocaleString()} for ${userName || 'Participant'}.</p><p>© ${new Date().getFullYear()} KareerFit</p></div>
      </body></html>`;
    
    printWindow.document.open();
    printWindow.document.write(contentToPrint);
    printWindow.document.close();
    
    printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
  };

  if (showProcessingScreen) {
    return <AssessmentProcessingScreen assessmentType={assessmentType as any} assessmentId={assessmentId} onComplete={handleProcessingComplete} />;
  }

  if (loading || status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><div className="w-16 h-16 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin mx-auto"></div><p className="mt-4 text-gray-600">Loading assessment...</p></div></div>;
  }

  if (assessment && !assessment.manualProcessing && assessment.tier !== 'standard' && assessment.tier !== 'premium' && (!assessmentData?.aiProcessed && !assessmentData?.aiError)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="relative"><div className="w-20 h-20 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin mx-auto mb-6"></div><div className="absolute inset-0 flex items-center justify-center"><div className="w-12 h-12 bg-[#7e43f1] rounded-full opacity-20 animate-pulse"></div></div></div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Processing Your Assessment</h3>
          <p className="text-gray-600 mb-4">Our AI is analyzing your responses to provide personalized insights.</p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500"><div className="w-2 h-2 bg-[#7e43f1] rounded-full animate-bounce"></div><div className="w-2 h-2 bg-[#7e43f1] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div><div className="w-2 h-2 bg-[#7e43f1] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div><span className="ml-2">This may take a few moments</span></div>
          <button onClick={handleRefreshResults} className="mt-6 px-4 py-2 text-sm text-[#7e43f1] hover:bg-purple-50 rounded-lg transition-colors">Check Status</button>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full"><div className="text-red-500 mb-4 text-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><h2 className="text-xl font-bold text-center mb-4">Error</h2><p className="text-gray-600 text-center mb-6">{error}</p><div className="flex justify-center space-x-3"><button onClick={fetchResults} className="bg-[#7e43f1] hover:bg-[#6a38d1] text-white px-4 py-2 rounded-lg">Try Again</button><button onClick={() => router.push('/dashboard')} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">Go to Dashboard</button></div></div></div>;
  }

  if (!assessment || !assessmentData) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center"><h2 className="text-xl font-bold mb-4">No Results Found</h2><p className="text-gray-600 mb-6">We couldn't find any results for this assessment.</p><button onClick={() => router.push('/dashboard')} className="bg-[#7e43f1] hover:bg-[#6a38d1] text-white px-4 py-2 rounded-lg">Go to Dashboard</button></div></div>;
  }
  
  // ✅ SAFE: Data extraction is now safer due to normalization in fetchResults
  const { scores, recommendations, strengths, improvements, summary, completedAt, careerFit, resumeAnalysis } = assessmentData;
  const overallScore = scores.overallScore || 70;
  const readinessLevel = assessmentData.readinessLevel || calculateReadinessLevel(overallScore);
  const readinessLevelColor = getReadinessLevelColor(readinessLevel);

  return (
    <div className="print-container min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto" ref={contentRef}>
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="print-header bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
            <h1 className="text-2xl font-bold">{assessmentTypeLabels[assessmentType] || assessmentType} Results</h1>
            <p className="text-white/80 mt-1">Completed on {new Date(completedAt || '').toLocaleDateString()}</p>
          </div>

          <div className="p-6 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] flex items-center justify-center text-white font-bold text-lg">{getUserInitials()}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{getUserName() || 'Participant'}</h3>
                  <p className="text-sm text-gray-600">{getUserEmail() || session?.user?.email || 'No email'}</p>
                  {getUserTargetPosition() && <p className="text-sm text-blue-600 font-medium">Target Role: {getUserTargetPosition()}</p>}
                </div>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">✅ Assessment Completed</div>
                {assessmentData?.evidenceLevel && (<div className="mt-2"><span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${assessmentData.evidenceLevel === 'STRONG' ? 'bg-green-200 text-green-800' : assessmentData.evidenceLevel === 'MODERATE' ? 'bg-blue-200 text-blue-800' : assessmentData.evidenceLevel === 'WEAK' ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'}`}>{assessmentData.evidenceLevel} Evidence</span></div>)}
              </div>
            </div>
          </div>

          <div className="p-6 border-b"><div className="text-center"><h2 className="text-xl font-semibold text-gray-800 mb-2">Overall Score</h2><div className="flex justify-center flex-col items-center"><div className="relative h-36 w-36"><div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl font-bold text-gray-800">{Math.round(overallScore)}%</span></div><svg className="h-full w-full" viewBox="0 0 36 36"><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e6e6e6" strokeWidth="3" /><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={getScoreColor(overallScore).replace('bg-','')} strokeWidth="3" strokeDasharray={`${overallScore}, 100`} strokeLinecap="round" /></svg></div><div className="mt-2"><span className="font-medium">Readiness Level: </span><span className={`font-bold ${readinessLevelColor}`}>{readinessLevel}</span></div></div><p className="mt-4 text-gray-600 max-w-xl mx-auto">{summary}</p></div></div>
        </div>
        
        {/* ✅ SAFE: Career Fit Analysis with null checks & optional chaining */}
        {careerFit && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8"><div className="p-6"><h2 className="text-xl font-semibold text-gray-800 mb-4">Career Fit Analysis</h2><div className={`p-6 rounded-lg border-l-4 ${getFitLevelColor(careerFit.fitLevel)}`}>
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="text-lg font-bold">Fit Level: {careerFit.fitLevel.replace(/_/g, ' ')}</h3><div className="text-2xl font-bold mt-1">{careerFit.fitPercentage}% Match</div></div>
              <div className={`px-4 py-2 rounded-full text-sm font-bold ${getFitLevelBadge(careerFit.fitLevel)}`}>{getFitLevelLabel(careerFit.fitLevel)}</div>
            </div>
            <div className="space-y-4">
              <div><h4 className="font-semibold mb-2 text-gray-800">Honest Assessment:</h4><p className="text-gray-700">{careerFit.honestAssessment}</p></div>
              <div><h4 className="font-semibold mb-2 text-gray-800">Reality Check:</h4><p className="text-gray-700">{careerFit.realityCheck}</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><h4 className="font-semibold mb-2 text-gray-800">Market Competitiveness:</h4><p className="text-sm text-gray-600">{careerFit.marketCompetitiveness}</p></div>
                <div><h4 className="font-semibold mb-2 text-gray-800">Time to Full Readiness:</h4><p className="text-sm text-gray-600">{careerFit.timeToReadiness}</p></div>
              </div>
              {careerFit.criticalGaps?.length > 0 && (<div><h4 className="font-semibold mb-2 text-gray-800">Critical Gaps to Address:</h4><ul className="list-disc list-inside space-y-1 text-gray-700">{careerFit.criticalGaps.map((gap, index) => (<li key={index}>{gap}</li>))}</ul></div>)}
              {careerFit.competitiveAdvantages?.length > 0 && (<div><h4 className="font-semibold mb-2 text-gray-800">Your Competitive Advantages:</h4><ul className="list-disc list-inside space-y-1 text-gray-700">{careerFit.competitiveAdvantages.map((advantage, index) => (<li key={index}>{advantage}</li>))}</ul></div>)}
            </div>
          </div></div></div>
        )}

        {/* ✅ SAFE: Resume Analysis with null checks & optional chaining. This section is now fully crash-proof. */}
        {resumeAnalysis && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8"><div className="p-6"><h2 className="text-xl font-semibold text-gray-800 mb-4">Resume Analysis</h2><div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Resume Quality Assessment</h3>
              <div className="flex items-center space-x-3">
                <div className="text-right"><div className="font-bold text-lg">{resumeAnalysis.credibilityScore}%</div><div className="text-sm text-gray-600">Credibility</div></div>
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${resumeAnalysis.credibilityScore >= 80 ? 'bg-green-200 text-green-800' : resumeAnalysis.credibilityScore >= 60 ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'}`}>{resumeAnalysis.experienceLevel}</div>
              </div>
            </div>
            <p className="text-gray-700 mb-4">{resumeAnalysis.analysis}</p>
            {resumeAnalysis.keyFindings?.length > 0 && (<div className="mb-4"><h4 className="font-semibold mb-2">Key Findings:</h4><ul className="list-disc list-inside space-y-1 text-gray-600">{resumeAnalysis.keyFindings.map((finding, index) => (<li key={index}>{finding}</li>))}</ul></div>)}
            
            {/* 🔥 FIX: The original crash point is now safe */}
            {resumeAnalysis.skillsValidation && (<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {resumeAnalysis.skillsValidation.evidenced?.length > 0 && (<div className="bg-green-50 p-3 rounded border border-green-200"><h5 className="font-semibold text-green-800 mb-2">Evidenced Skills</h5><ul className="text-sm text-green-700 space-y-1">{resumeAnalysis.skillsValidation.evidenced.map((skill, i) => (<li key={i}>• {skill}</li>))}</ul></div>)}
                {resumeAnalysis.skillsValidation.claimed?.length > 0 && (<div className="bg-blue-50 p-3 rounded border border-blue-200"><h5 className="font-semibold text-blue-800 mb-2">Claimed Skills</h5><ul className="text-sm text-blue-700 space-y-1">{resumeAnalysis.skillsValidation.claimed.map((skill, i) => (<li key={i}>• {skill}</li>))}</ul></div>)}
                {resumeAnalysis.skillsValidation.missing?.length > 0 && (<div className="bg-red-50 p-3 rounded border border-red-200"><h5 className="font-semibold text-red-800 mb-2">Unproven Claims</h5><ul className="text-sm text-red-700 space-y-1">{resumeAnalysis.skillsValidation.missing.map((skill, i) => (<li key={i}>• {skill}</li>))}</ul></div>)}
            </div>)}
            
            {resumeAnalysis.gapAnalysis?.length > 0 && (<div className="mb-4"><h4 className="font-semibold mb-2">Gap Analysis:</h4><ul className="list-disc list-inside space-y-1 text-gray-600">{resumeAnalysis.gapAnalysis.map((gap, index) => (<li key={index}>{gap}</li>))}</ul></div>)}
            {resumeAnalysis.recommendations?.length > 0 && (<div><h4 className="font-semibold mb-2">Resume Improvement Recommendations:</h4><ul className="list-disc list-inside space-y-1 text-gray-600">{resumeAnalysis.recommendations.map((rec, index) => (<li key={index}>{rec}</li>))}</ul></div>)}
          </div></div></div>
        )}

        {assessment.reviewNotes && manualStatus === 'completed' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8"><div className="p-6"><h2 className="text-xl font-semibold text-gray-800 mb-4">Expert Review</h2><div className="bg-blue-50 p-6 rounded-lg border border-blue-100"><p className="text-blue-800 font-medium mb-3">Reviewed on {new Date(assessment.reviewedAt || assessment.updatedAt).toLocaleDateString()}</p><div className="prose prose-blue max-w-none"><div className="whitespace-pre-wrap">{assessment.reviewNotes}</div></div></div></div></div>
        )}

        {(strengths?.length > 0 || improvements?.length > 0) && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8"><div className="p-6"><h2 className="text-xl font-semibold text-gray-800 mb-4">Key Insights</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {strengths?.length > 0 && (<div className="bg-green-50 p-5 rounded-lg border border-green-200"><h3 className="text-lg font-medium text-green-800 mb-3">Your Strengths</h3><ul className="list-disc list-inside space-y-2">{strengths.map((strength, index) => (<li key={index} className="text-gray-700">{strength}</li>))}</ul></div>)}
            {improvements?.length > 0 && (<div className="bg-yellow-50 p-5 rounded-lg border border-yellow-200"><h3 className="text-lg font-medium text-yellow-800 mb-3">Areas for Improvement</h3><ul className="list-disc list-inside space-y-2">{improvements.map((improvement, index) => (<li key={index} className="text-gray-700">{improvement}</li>))}</ul></div>)}
          </div></div></div>
        )}

        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8"><div className="p-6"><h2 className="text-xl font-semibold text-gray-800 mb-4">Category Scores</h2>
            {Object.keys(scores).filter(key => key !== 'overallScore').length === 0 ? (<div className="text-center py-8 text-gray-500"><p>No detailed category scores available.</p></div>) : (<div className="space-y-6">{Object.entries(scores).filter(([key]) => key !== 'overallScore').map(([category, score], index) => {const numericScore = typeof score === 'number' ? Math.round(score) : 0; const displayName = categoryDisplayMap[category] || formatCategoryName(category); return (<div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-100"><div className="flex justify-between items-center mb-2"><h3 className="font-semibold text-gray-800">{displayName}</h3><div className="flex items-center"><div className={`h-4 w-4 rounded-full mr-2 ${getScoreColor(numericScore)}`}></div><span className="font-bold text-lg">{numericScore}%</span></div></div><div className="w-full bg-gray-200 rounded-full h-3 mb-2"><div className={`h-3 rounded-full ${getScoreColor(numericScore)}`} style={{ width: `${numericScore}%` }}></div></div></div>);})}</div>)}
        </div></div>

        {recommendations?.length > 0 && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8"><div className="p-6"><h2 className="text-xl font-semibold text-gray-800 mb-4">Action Plan & Recommendations</h2><div className="space-y-8">{recommendations.map((rec, index) => (
            <div key={index} className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm mt-0.5 mr-3">{index + 1}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-blue-800 mb-2">{rec.title}</h3>
                  <div className="flex items-center space-x-4 mb-3">
                    {rec.priority && (<span className={`px-2 py-1 rounded text-xs font-bold ${rec.priority === 'HIGH' ? 'bg-red-200 text-red-800' : rec.priority === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>{rec.priority} PRIORITY</span>)}
                    {rec.timeframe && (<span className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs font-bold">{rec.timeframe}</span>)}
                  </div>
                </div>
              </div>
              <div className="ml-11">
                <p className="text-gray-700 mb-4 font-medium">{rec.explanation}</p>
                {rec.steps?.length > 0 && (<div className="bg-white p-4 rounded-lg border border-blue-100 mb-4"><h4 className="text-md font-bold text-blue-700 mb-3">Implementation Steps:</h4><ol className="list-decimal list-inside space-y-3 text-gray-800">{rec.steps.map((step, i) => (<li key={i} className="pl-2"><span className="font-medium">{step}</span></li>))}</ol></div>)}
                {rec.successMetrics?.length > 0 && (<div className="bg-green-50 p-4 rounded-lg border border-green-100"><h4 className="text-md font-bold text-green-700 mb-3">Success Metrics:</h4><ul className="list-disc list-inside space-y-2 text-green-800">{rec.successMetrics?.map((metric, i) => (<li key={i}>{metric}</li>))}</ul></div>)}
              </div>
            </div>
          ))}</div></div></div>
        )}

        <div className="print-hidden flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-8">
          <button onClick={() => router.push('/dashboard')} className="bg-white text-[#7e43f1] border border-[#7e43f1] px-6 py-3 rounded-lg font-medium hover:bg-purple-50 transition-colors">Back to Dashboard</button>
          {manualStatus === 'pending_review' || manualStatus === 'in_review' ? (<button onClick={handleRefreshResults} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">Check Status</button>) : aiStatus === 'processing' ? (<button onClick={handleRefreshResults} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"><div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>Refresh Results</button>) : (<button onClick={handlePrint} className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] hover:from-[#7e43f1] hover:to-[#38b6ff] text-white px-6 py-3 rounded-lg font-medium transition-colors">Download Enhanced Results</button>)}
        </div>
      </div>
    </div>
  );
}

function formatCategoryName(category: string): string {
  return category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
}