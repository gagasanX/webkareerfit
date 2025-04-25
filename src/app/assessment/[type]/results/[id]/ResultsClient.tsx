'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Enhanced recommendation interface that matches the AI prompt output format
interface RecommendationWithDetails {
  title: string;
  explanation: string;
  steps: string[];
}

interface ScoresData {
  [key: string]: number;
  overallScore: number;
}

interface AssessmentData {
  scores: ScoresData;
  readinessLevel: string;
  recommendations: RecommendationWithDetails[];
  summary: string;
  strengths: string[];
  improvements: string[];
  categoryAnalysis?: Record<string, {
    score: number;
    strengths: string[];
    improvements: string[];
  }>;
  answers?: Record<string, any>;
  completedAt?: string;
  submittedAt?: string;
  resumeText?: string;
  resumeAnalysis?: string;
  resumeRecommendations?: string[];
  aiProcessed?: boolean;
  aiProcessedAt?: string;
  aiAnalysisStarted?: boolean;
  aiAnalysisStartedAt?: string;
  aiError?: string;
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
  const [pollingCount, setPollingCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
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

  // Mapping between backend category names and UI display names
  // Add index signature to allow string indexing
  const categoryDisplayMap: { [key: string]: string } = {
    // CCRL - Career Comeback Readiness Level
    skillCurrency: 'Skill Renewal',
    marketKnowledge: 'Market Knowledge',
    confidenceLevel: 'Confidence Readiness',
    networkStrength: 'Networking Relationships',
    
    // FJRL - First Job Readiness Level
    technicalSkills: 'Technical Skills',
    jobMarketAwareness: 'Job Market Awareness',
    professionalPresentation: 'Professional Presentation',
    interviewPreparation: 'Interview Preparedness',
    
    // IJRL - Ideal Job Readiness Level
    careerGoalClarity: 'Career Goal Clarity',
    qualificationGap: 'Qualification Gap',
    industryKnowledge: 'Industry Knowledge',
    networkDevelopment: 'Network Development',
    
    // CDRL - Career Development Readiness Level
    leadershipPotential: 'Leadership Potential',
    strategicThinking: 'Strategic Thinking',
    domainExpertise: 'Domain Expertise',
    changeManagement: 'Change Management',
    
    // CTRL - Career Transition Readiness Level
    transferableSkills: 'Transferable Skills',
    targetIndustryKnowledge: 'Target Industry Knowledge',
    adaptability: 'Adaptability',
    transitionStrategy: 'Transition Strategy',
    
    // RRL - Retirement Readiness Level
    financialPreparation: 'Financial Preparation',
    psychologicalReadiness: 'Psychological Readiness',
    postRetirementPlan: 'Post-Retirement Plan',
    knowledgeTransfer: 'Knowledge Transfer',
    
    // IRL - Internship Readiness Level
    academicPreparation: 'Academic Preparation',
    professionalAwareness: 'Professional Awareness',
    practicalExperience: 'Practical Experience',
    learningOrientation: 'Learning Orientation',
    
    // Fallback
    careerPlanning: 'Career Planning',
    skillsDevelopment: 'Skills Development',
    professionalNetworking: 'Professional Networking'
  };

  // Get appropriate categories for each assessment type
  function getExpectedCategories(assessmentType: string): string[] {
    switch (assessmentType.toLowerCase()) {
      case 'fjrl':
        return ['technicalSkills', 'jobMarketAwareness', 'professionalPresentation', 'interviewPreparation'];
      case 'ijrl':
        return ['careerGoalClarity', 'qualificationGap', 'industryKnowledge', 'networkDevelopment'];
      case 'cdrl':
        return ['leadershipPotential', 'strategicThinking', 'domainExpertise', 'changeManagement'];
      case 'ccrl':
        return ['skillCurrency', 'marketKnowledge', 'confidenceLevel', 'networkStrength'];
      case 'ctrl':
        return ['transferableSkills', 'targetIndustryKnowledge', 'adaptability', 'transitionStrategy'];
      case 'rrl':
        return ['financialPreparation', 'psychologicalReadiness', 'postRetirementPlan', 'knowledgeTransfer'];
      case 'irl':
        return ['academicPreparation', 'professionalAwareness', 'practicalExperience', 'learningOrientation'];
      default:
        return ['careerPlanning', 'skillsDevelopment', 'professionalNetworking', 'industryKnowledge'];
    }
  }

  // Fetch assessment results
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/assessment/${assessmentType}/results/${assessmentId}`);
      return;
    }

    if (status === 'authenticated' && assessmentType && assessmentId) {
      fetchResults();
    }
  }, [status, assessmentType, assessmentId, router]);

  // Poll for AI updates if needed
  useEffect(() => {
    if (assessmentData && 
        assessmentData.aiAnalysisStarted && 
        !assessmentData.aiProcessed && 
        pollingCount < 30) {
      
      console.log(`Polling for AI updates (attempt ${pollingCount + 1})...`);
      setDebugInfo(`Polling for AI updates (attempt ${pollingCount + 1})`);
      
      const timer = setTimeout(() => {
        fetchResults();
        setPollingCount(prev => prev + 1);
      }, 10000); // Poll every 10 seconds
      
      return () => clearTimeout(timer);
    }
  }, [assessmentData, pollingCount]);

  const fetchResults = async () => {
    if (!assessmentType || !assessmentId) {
      setError('Missing assessment type or ID');
      return;
    }
    
    try {
      console.log(`Fetching results for assessment: ${assessmentType}/${assessmentId}`);
      setDebugInfo(`Fetching results for assessment: ${assessmentType}/${assessmentId}`);
      
      // Add a cache-busting parameter
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
      
      let data;
      try {
        data = await response.json();
        console.log('Assessment data received:', data);
      } catch (e) {
        console.error('Error parsing response JSON:', e);
        throw new Error('Failed to parse server response');
      }
      
      setAssessment(data);
      
      // Get assessment data
      const responseData = data.data || {};
      
      // Get expected categories for this assessment type
      const expectedCategories = getExpectedCategories(assessmentType);
      
      // IMPORTANT: Initialize the scores object properly
      let scoresObj = { overallScore: 70 } as ScoresData; // Default overall score
      
      // Process the scores from the response
      if (responseData.scores && typeof responseData.scores === 'object' && !Array.isArray(responseData.scores)) {
        const receivedScores = responseData.scores;
        
        // Log received scores for debugging
        console.log('Received scores:', receivedScores);
        
        // Check for uniform scores (potential issue)
        if (Object.keys(receivedScores).length > 1) {
          const scoreValues = Object.entries(receivedScores)
            .filter(([key]) => key !== 'overallScore')
            .map(([_, value]) => typeof value === 'number' ? value : Number(value));
          
          const uniqueScores = new Set(scoreValues);
          console.log(`Score values: ${scoreValues.join(', ')}`);
          console.log(`Unique score count: ${uniqueScores.size} of ${scoreValues.length}`);
          
          if (uniqueScores.size === 1 && scoreValues.length > 1) {
            console.warn('WARNING: All scores are identical. This may indicate an issue with AI analysis.');
            setDebugInfo(`Warning: All scores are identical (${scoreValues[0]}). This may indicate an issue.`);
          }
        }
        
        // Make sure all expected categories have scores
        expectedCategories.forEach(category => {
          if (!receivedScores.hasOwnProperty(category)) {
            console.warn(`Expected category ${category} missing from response`);
          }
        });
        
        // Copy valid scores to our scores object
        Object.entries(receivedScores).forEach(([key, value]) => {
          if (typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 100) {
            scoresObj[key] = value;
          } else if (value !== undefined) {
            // Try to convert to number if possible
            const numValue = Number(value);
            if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
              scoresObj[key] = numValue;
              console.log(`Converted score ${key} from ${value} to ${numValue}`);
            } else {
              console.warn(`Invalid score value for ${key}: ${value}, ignoring`);
            }
          }
        });
      }
      
      // Calculate overall score if missing or invalid
      if (!scoresObj.hasOwnProperty('overallScore') || 
          typeof scoresObj.overallScore !== 'number' || 
          isNaN(scoresObj.overallScore) || 
          scoresObj.overallScore < 0 || 
          scoresObj.overallScore > 100) {
        
        const categoryScores = Object.entries(scoresObj)
          .filter(([key]) => key !== 'overallScore')
          .map(([_, value]) => value);
        
        if (categoryScores.length > 0) {
          scoresObj.overallScore = Math.round(
            categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length
          );
          console.log(`Calculated overallScore: ${scoresObj.overallScore} from ${categoryScores.length} categories`);
        } else {
          scoresObj.overallScore = 70; // Default
          console.log(`Using default overallScore: ${scoresObj.overallScore}`);
        }
      }
      
      // Explicitly round the overall score to ensure it's an integer
      scoresObj.overallScore = Math.round(scoresObj.overallScore);
      
      // Normalize recommendations to ensure they have the proper structure
      const normalizedRecommendations = normalizeRecommendations(responseData.recommendations || []);
      
      // Determine readiness level from overall score if missing
      let readinessLevel = responseData.readinessLevel || '';
      if (!readinessLevel) {
        readinessLevel = calculateReadinessLevel(scoresObj.overallScore);
        console.log(`Calculated readiness level: ${readinessLevel}`);
      }
      
      // Create the isAnalysisStarted flag by combining the two possible flags
      const isAnalysisStarted = Boolean(responseData.aiAnalysisStarted || responseData.aiProcessing);
      
      // Ensure data has required properties with defaults
      const processedData: AssessmentData = {
        scores: scoresObj,
        readinessLevel: readinessLevel,
        recommendations: normalizedRecommendations,
        summary: responseData.summary || 'Assessment completed. This provides insights into your current career readiness.',
        strengths: responseData.strengths || ["Completed comprehensive career assessment"],
        improvements: responseData.improvements || ["Continue developing your skills and knowledge"],
        categoryAnalysis: responseData.categoryAnalysis,
        completedAt: responseData.completedAt || data.completedAt || new Date().toISOString(),
        submittedAt: responseData.submittedAt || data.createdAt || new Date().toISOString(),
        resumeText: responseData.resumeText,
        resumeAnalysis: responseData.resumeAnalysis,
        resumeRecommendations: responseData.resumeRecommendations,
        aiProcessed: responseData.aiProcessed || false,
        aiAnalysisStarted: isAnalysisStarted,
        aiAnalysisStartedAt: responseData.aiAnalysisStartedAt || responseData.aiProcessingStarted,
        aiProcessedAt: responseData.aiProcessedAt,
        aiError: responseData.aiError,
      };
      
      // Check AI processing status
      if (processedData.aiProcessed) {
        setAiStatus('completed');
        setDebugInfo('AI analysis is complete');
      } else if (processedData.aiAnalysisStarted) {
        setAiStatus('processing');
        setDebugInfo('AI analysis in progress');
      } else if (processedData.aiError) {
        setAiStatus('failed');
        setDebugInfo(`AI analysis failed: ${processedData.aiError}`);
      } else {
        setDebugInfo('No AI analysis started yet');
      }
      
      console.log('Processed assessment data:', processedData);
      setAssessmentData(processedData);
      setLoading(false);
      setError('');
    } catch (err) {
      console.error('Error fetching assessment results:', err);
      setError(err instanceof Error ? err.message : 'Error loading assessment results. Please try again.');
      setLoading(false);
      setAiStatus('failed');
      setDebugInfo(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Helper function to normalize recommendations to the expected format
  const normalizeRecommendations = (recommendations: any[]): RecommendationWithDetails[] => {
    if (!Array.isArray(recommendations)) {
      console.warn('Recommendations is not an array, using empty array instead');
      recommendations = [];
    }
    
    return recommendations.map(rec => {
      // If it's already in the correct format with title, explanation and steps
      if (rec && typeof rec === 'object' && rec.title && rec.explanation && Array.isArray(rec.steps)) {
        return rec as RecommendationWithDetails;
      }
      // If it's a string recommendation
      else if (typeof rec === 'string') {
        return {
          title: rec,
          explanation: "This recommendation will help you develop essential skills for your career advancement.",
          steps: [
            "Research resources and methods to implement this recommendation",
            "Create a specific action plan with measurable goals",
            "Track your progress and adjust as needed"
          ]
        };
      }
      // If it's an object with missing properties
      else if (rec && typeof rec === 'object') {
        return {
          title: rec.title || "Career Development Recommendation",
          explanation: rec.explanation || rec.description || "This will help you address gaps in your current career readiness.",
          steps: Array.isArray(rec.steps) ? rec.steps : [
            "Develop a detailed plan for implementation",
            "Seek resources and support to help you succeed",
            "Set specific milestones to track your progress"
          ]
        };
      }
      // Default fallback
      return {
        title: "Enhance Your Career Development",
        explanation: "Focusing on continuous improvement is essential for career growth.",
        steps: [
          "Identify specific skills or knowledge areas to develop",
          "Find appropriate resources or training opportunities",
          "Practice and apply what you learn in real-world settings"
        ]
      };
    });
  };

  // Function to calculate readiness level based on score
  const calculateReadinessLevel = (score: number): string => {
    if (score < 50) return "Early Development";
    if (score < 70) return "Developing Competency";
    if (score < 85) return "Approaching Readiness";
    return "Fully Prepared";
  };

  // Manual refresh function
  const handleRefreshResults = () => {
    setLoading(true);
    setDebugInfo('Manually refreshing results...');
    fetchResults();
  };

  // Helper to get color based on score percentage
  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    if (percentage >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Get readiness level color
  const getReadinessLevelColor = (level: string): string => {
    switch (level) {
      case "Early Development":
        return "text-red-600";
      case "Developing Competency":
        return "text-yellow-600";
      case "Approaching Readiness":
        return "text-blue-600";
      case "Fully Prepared":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  // Function to handle printing with proper layout
  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Please allow popups for this website to download your results.');
      return;
    }
    
    // Safely access the overall score
    const overallScore = assessmentData?.scores?.overallScore ?? 70;
    
    // Generate category scores HTML for printing
    const categoryScoresHTML = assessmentData && assessmentData.scores 
      ? Object.entries(assessmentData.scores)
          .filter(([key]) => key !== 'overallScore')
          .map(([category, score]) => {
            const scoreValue = typeof score === 'number' ? Math.round(score) : 0;
            const scoreColor = scoreValue >= 80 ? '#48bb78' : 
                             scoreValue >= 60 ? '#4299e1' : 
                             scoreValue >= 40 ? '#ecc94b' : 
                             scoreValue >= 20 ? '#ed8936' : '#f56565';
            
            // Use the category display map for printing
            const displayName = categoryDisplayMap[category] || formatCategoryName(category);
            
            return `
              <div class="score-row">
                <div class="score-label">
                  <span>${displayName}</span>
                  <span>${scoreValue}%</span>
                </div>
                <div class="score-bar-container">
                  <div class="score-bar" style="width: ${scoreValue}%; background-color: ${scoreColor};"></div>
                </div>
                
                <!-- Category Analysis (if available) -->
                ${assessmentData.categoryAnalysis && assessmentData.categoryAnalysis[category] ? `
                  <div class="category-analysis">
                    ${assessmentData.categoryAnalysis[category].strengths && assessmentData.categoryAnalysis[category].strengths.length > 0 ? `
                      <div class="category-strengths">
                        <h4>Strengths:</h4>
                        <ul>
                          ${assessmentData.categoryAnalysis[category].strengths.map(strength => 
                            `<li>${strength}</li>`
                          ).join('')}
                        </ul>
                      </div>
                    ` : ''}
                    
                    ${assessmentData.categoryAnalysis[category].improvements && assessmentData.categoryAnalysis[category].improvements.length > 0 ? `
                      <div class="category-improvements">
                        <h4>Areas to improve:</h4>
                        <ul>
                          ${assessmentData.categoryAnalysis[category].improvements.map(improvement => 
                            `<li>${improvement}</li>`
                          ).join('')}
                        </ul>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('') 
      : '<p>No detailed category scores available</p>';
    
    // Generate the print-optimized HTML content
    const contentToPrint = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Assessment Results - ${assessmentTypeLabels[assessmentType] || assessmentType}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          @media print {
            @page { 
              size: portrait;
              margin: 1cm;
            }
          }
          
          body {
            font-family: Arial, sans-serif;
            line-height: 1.5;
            color: #333;
            padding: 20px;
            max-width: 1000px;
            margin: 0 auto;
          }
          
          .header {
            background-color: #5a67d8;
            color: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 10px;
          }
          
          .section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 10px;
            break-inside: avoid;
          }
          
          h1 {
            font-size: 24px;
            margin: 0 0 10px 0;
          }
          
          h2 {
            font-size: 20px;
            margin: 0 0 15px 0;
            color: #4a5568;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 5px;
          }
          
          h3 {
            font-size: 18px;
            margin: 0 0 10px 0;
            color: #2d3748;
          }
          
          h4 {
            font-size: 16px;
            margin: 10px 0 5px 0;
            color: #4a5568;
          }
          
          .score-container {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
          }
          
          .score-circle {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background-color: #f7fafc;
            border: 10px solid ${overallScore >= 80 ? '#48bb78' : 
                               overallScore >= 60 ? '#4299e1' : 
                               overallScore >= 40 ? '#ecc94b' : 
                               overallScore >= 20 ? '#ed8936' : '#f56565'};
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 24px;
            font-weight: bold;
            margin-right: 20px;
          }
          
          .score-info {
            flex: 1;
          }
          
          .readiness-level {
            font-weight: bold;
            font-size: 20px;
            color: ${assessmentData?.readinessLevel === "Fully Prepared" ? '#48bb78' : 
                   assessmentData?.readinessLevel === "Approaching Readiness" ? '#4299e1' : 
                   assessmentData?.readinessLevel === "Developing Competency" ? '#ecc94b' : '#f56565'};
            margin: 10px 0;
          }
          
          .summary {
            margin-top: 10px;
            line-height: 1.6;
          }
          
          .two-columns {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
          }
          
          .column {
            flex: 1;
            padding: 15px;
            border-radius: 10px;
          }
          
          .strengths {
            background-color: #f0fff4;
            border: 1px solid #c6f6d5;
          }
          
          .improvements {
            background-color: #fffbeb;
            border: 1px solid #feebc8;
          }
          
          .score-row {
            margin-bottom: 25px;
            break-inside: avoid;
            padding-bottom: 15px;
            border-bottom: 1px solid #edf2f7;
          }
          
          .score-row:last-child {
            border-bottom: none;
          }
          
          .score-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-weight: 500;
          }
          
          .score-bar-container {
            height: 10px;
            background-color: #edf2f7;
            border-radius: 5px;
            overflow: hidden;
            margin-bottom: 10px;
          }
          
          .score-bar {
            height: 100%;
            background-color: #4299e1;
            border-radius: 5px;
          }
          
          .category-analysis {
            margin-top: 10px;
            padding-left: 15px;
            border-left: 3px solid #cbd5e0;
            font-size: 14px;
          }
          
          .category-strengths h4 {
            color: #38a169;
            margin-bottom: 5px;
          }
          
          .category-improvements h4 {
            color: #dd6b20;
            margin-bottom: 5px;
            margin-top: 10px;
          }
          
          ul, ol {
            margin-top: 5px;
            padding-left: 25px;
            margin-bottom: 10px;
          }
          
          li {
            margin-bottom: 5px;
          }
          
          .recommendation {
            background-color: #ebf8ff;
            border: 1px solid #bee3f8;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
            break-inside: avoid;
          }
          
          .recommendation-title {
            font-size: 18px;
            font-weight: bold;
            color: #2b6cb0;
            margin-bottom: 10px;
          }
          
          .recommendation-explanation {
            margin-bottom: 15px;
          }
          
          .implementation-steps {
            background-color: #fff;
            border: 1px solid #bee3f8;
            border-radius: 8px;
            padding: 12px;
          }
          
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #718096;
            text-align: center;
          }
          
          /* Print-specific styles */
          @media print {
            body {
              padding: 0;
            }
            
            .no-print {
              display: none;
            }
            
            .section {
              page-break-inside: avoid;
            }
            
            .header {
              background-color: #f7fafc !important;
              color: #000 !important;
              border: 1px solid #000;
            }
            
            /* Ensure colors are preserved in print */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        <!-- Header Section -->
        <div class="header">
          <h1>${assessmentTypeLabels[assessmentType] || assessmentType} Results</h1>
          <p>Completed on ${new Date(assessmentData?.completedAt || new Date()).toLocaleDateString()}</p>
        </div>
        
        <!-- Overall Score Section -->
        <div class="section">
          <h2>Overall Score</h2>
          <div class="score-container">
            <div class="score-circle">${Math.round(overallScore)}%</div>
            <div class="score-info">
              <div class="readiness-level">Readiness Level: ${assessmentData?.readinessLevel || 'Not Available'}</div>
              <div class="summary">${assessmentData?.summary || 'Assessment completed successfully.'}</div>
            </div>
          </div>
        </div>
        
        <!-- Strengths and Improvements Section -->
        <div class="section">
          <h2>Key Insights</h2>
          <div class="two-columns">
            <div class="column strengths">
              <h3>Your Strengths</h3>
              <ul>
                ${assessmentData?.strengths?.map(strength => `<li>${strength}</li>`).join('') || '<li>Completed comprehensive career assessment</li>'}
              </ul>
            </div>
            <div class="column improvements">
              <h3>Areas for Improvement</h3>
              <ul>
                ${assessmentData?.improvements?.map(improvement => `<li>${improvement}</li>`).join('') || '<li>Continue developing your skills and knowledge</li>'}
              </ul>
            </div>
          </div>
        </div>
        
        <!-- Category Scores Section -->
        <div class="section">
          <h2>Category Scores</h2>
          ${categoryScoresHTML}
        </div>
        
        <!-- Recommendations Section -->
        <div class="section">
          <h2>Action Plan & Recommendations</h2>
          ${assessmentData?.recommendations?.map((rec, index) => `
            <div class="recommendation">
              <div class="recommendation-title">${index + 1}. ${rec.title}</div>
              <div class="recommendation-explanation">${rec.explanation}</div>
              <div class="implementation-steps">
                <h3>Implementation Steps:</h3>
                <ol>
                  ${rec.steps.map(step => `<li>${step}</li>`).join('')}
                </ol>
              </div>
            </div>
          `).join('') || '<p>No specific recommendations available</p>'}
        </div>
        
        <!-- Footer Section -->
        <div class="footer">
          <p>This report was generated on ${new Date().toLocaleString()} based on your assessment responses.</p>
          <p>© ${new Date().getFullYear()} KareerFit Assessment System</p>
        </div>
        
        <!-- Print button (only visible in browser) -->
        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print();" style="padding: 10px 20px; background-color: #4299e1; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
            Print or Save as PDF
          </button>
        </div>
      </body>
      </html>
    `;
    
    // Write content to the new window
    printWindow.document.open();
    printWindow.document.write(contentToPrint);
    printWindow.document.close();
    
    // Trigger print when content is loaded
    printWindow.onload = function() {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  // Loading, error and not found states remain the same...
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent border-[#7e43f1] rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-red-500 mb-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-center mb-4">Error</h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          {debugInfo && (
            <div className="mb-6 p-3 bg-gray-100 text-sm text-gray-700 rounded-lg overflow-auto max-h-32">
              <strong>Debug Info:</strong> {debugInfo}
            </div>
          )}
          <div className="flex justify-center">
            <button
              onClick={fetchResults}
              className="bg-[#7e43f1] hover:bg-[#6a38d1] text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!assessment || !assessmentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-gray-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-4">No Results Found</h2>
          <p className="text-gray-600 mb-6">We couldn't find any results for this assessment.</p>
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-[#7e43f1] hover:bg-[#6a38d1] text-white px-4 py-2 rounded-lg"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Safely extract data for display
  const scores = assessmentData.scores || { overallScore: 70 };
  const recommendations = assessmentData.recommendations || [];
  const strengths = assessmentData.strengths || [];
  const improvements = assessmentData.improvements || [];
  const overallScore = scores.overallScore || 70;
  const summary = assessmentData.summary || 'Assessment completed successfully.';
  const completedAt = assessmentData.completedAt || new Date().toISOString();
  const categoryAnalysis = assessmentData.categoryAnalysis || {};
  const readinessLevel = assessmentData.readinessLevel || calculateReadinessLevel(overallScore);
  const readinessLevelColor = getReadinessLevelColor(readinessLevel);
  
  // Alert if all scores are the same (for development/debugging)
  const categoryScores = Object.entries(scores)
    .filter(([key]) => key !== 'overallScore')
    .map(([_, value]) => value);
  
  const hasUniformScores = categoryScores.length > 1 && 
    new Set(categoryScores).size === 1;

  return (
    <div className="print-container min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto" ref={contentRef}>
        {/* Debug info - show in development mode only */}
        {process.env.NODE_ENV === 'development' && (
          <div className="print-hidden mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <strong>Debug Info:</strong> {debugInfo}
            <div>Overall Score: {overallScore}</div>
            <div>Readiness Level: {readinessLevel}</div>
            <div>Category Scores: {Object.entries(scores).filter(([key]) => key !== 'overallScore').map(([key, value]) => `${key}=${value}`).join(', ')}</div>
            {hasUniformScores && (
              <div className="mt-2 text-red-600 font-bold">
                WARNING: All category scores are identical ({categoryScores[0]}). This may indicate an issue with the AI analysis.
              </div>
            )}
          </div>
        )}

        {/* Header section */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="print-header bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 text-white">
            <h1 className="text-2xl font-bold">
              {assessmentTypeLabels[assessmentType] || assessmentType} Results
            </h1>
            <p className="text-white/80 mt-1">
              Completed on {new Date(completedAt).toLocaleDateString()}
            </p>
          </div>

          {/* Overall score */}
          <div className="p-6 border-b">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Overall Score</h2>
              <div className="flex justify-center flex-col items-center">
                <div className="relative h-36 w-36">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800">{Math.round(overallScore)}%</span>
                  </div>
                  <svg className="h-full w-full" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e6e6e6"
                      strokeWidth="3"
                      strokeDasharray="100, 100"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={overallScore >= 80 ? "#48bb78" : 
                             overallScore >= 60 ? "#4299e1" : 
                             overallScore >= 40 ? "#ecc94b" : 
                             overallScore >= 20 ? "#ed8936" : "#f56565"}
                      strokeWidth="3"
                      strokeDasharray={`${overallScore}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                {/* Readiness Level */}
                <div className="mt-2">
                  <span className="font-medium">Readiness Level: </span>
                  <span className={`font-bold ${readinessLevelColor}`}>{readinessLevel}</span>
                </div>
              </div>
              <p className="mt-4 text-gray-600 max-w-xl mx-auto">{summary}</p>
              
              {/* AI analysis status indicator */}
              {aiStatus === 'processing' && (
                <div className="print-hidden mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-t-transparent border-blue-700 rounded-full animate-spin mr-2"></div>
                  <span>AI analysis in progress... This may take a few minutes.</span>
                  <button 
                    onClick={handleRefreshResults}
                    className="ml-3 text-xs underline hover:text-blue-800"
                  >
                    Refresh
                  </button>
                </div>
              )}
              
              {aiStatus === 'failed' && (
                <div className="print-hidden mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center justify-center">
                  <span>AI analysis encountered an error. Your results may be incomplete.</span>
                  <button 
                    onClick={handleRefreshResults}
                    className="ml-3 text-xs underline hover:text-red-800"
                  >
                    Try Again
                  </button>
                </div>
              )}
              
              {/* Warning for uniform scores */}
              {hasUniformScores && (
                <div className="print-hidden mt-4 p-3 bg-yellow-50 text-yellow-700 rounded-lg">
                  <p>
                    <strong>Note:</strong> The assessment shows identical scores across all categories, which is unusual. 
                    We're working to improve the variety in our analysis. You may want to refresh the results or try again later.
                  </p>
                  <button 
                    onClick={handleRefreshResults}
                    className="mt-2 text-sm underline hover:text-yellow-800"
                  >
                    Refresh Results
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Strengths and Improvements */}
        {(strengths.length > 0 || improvements.length > 0) && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Key Insights</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {strengths.length > 0 && (
                  <div className="bg-green-50 p-5 rounded-lg print-bg-light">
                    <h3 className="text-lg font-medium text-green-800 mb-3">Your Strengths</h3>
                    <ul className="list-disc list-inside space-y-2">
                      {strengths.map((strength, index) => (
                        <li key={index} className="text-gray-700">{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {improvements.length > 0 && (
                  <div className="bg-yellow-50 p-5 rounded-lg print-bg-light">
                    <h3 className="text-lg font-medium text-yellow-800 mb-3">Areas for Improvement</h3>
                    <ul className="list-disc list-inside space-y-2">
                      {improvements.map((improvement, index) => (
                        <li key={index} className="text-gray-700">{improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Detailed scores - IMPROVED */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Category Scores</h2>
            
            {Object.keys(scores).filter(key => key !== 'overallScore').length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No detailed category scores available for this assessment.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(scores)
                  .filter(([key]) => key !== 'overallScore')
                  .map(([category, score], index) => {
                    // Ensure score is a number
                    const numericScore = typeof score === 'number' ? Math.round(score) : 0;
                    const analysis = categoryAnalysis?.[category];
                    
                    // Use the display mapping for category names
                    const displayName = categoryDisplayMap[category] || formatCategoryName(category);
                    
                    return (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-semibold text-gray-800">{displayName}</h3>
                          <div className="flex items-center">
                            <div className={`h-4 w-4 rounded-full mr-2 ${getScoreColor(numericScore)}`}></div>
                            <span className="font-bold text-lg">{numericScore}%</span>
                          </div>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                          <div
                            className={`h-3 rounded-full ${getScoreColor(numericScore)}`}
                            style={{ width: `${numericScore}%` }}
                          ></div>
                        </div>
                        
                        {/* Show category analysis if available */}
                        {analysis && (
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {analysis.strengths && analysis.strengths.length > 0 && (
                              <div className="bg-green-50 p-3 rounded-md">
                                <h4 className="text-sm font-medium text-green-700 mb-2">Strengths:</h4>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                  {analysis.strengths.map((str, i) => (
                                    <li key={i}>{str}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {analysis.improvements && analysis.improvements.length > 0 && (
                              <div className="bg-yellow-50 p-3 rounded-md">
                                <h4 className="text-sm font-medium text-yellow-700 mb-2">Areas to focus on:</h4>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                  {analysis.improvements.map((imp, i) => (
                                    <li key={i}>{imp}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Recommendations section with more detailed display */}
        {recommendations && recommendations.length > 0 && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Action Plan & Recommendations</h2>
              
              <div className="space-y-8">
                {recommendations.map((recommendation, index) => (
                  <div key={index} className="bg-blue-50 rounded-lg p-6 print-bg-light border-l-4 border-blue-500">
                    <div className="flex items-start mb-4">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm mt-0.5 mr-3">
                        {index + 1}
                      </div>
                      <h3 className="text-lg font-bold text-blue-800">{recommendation.title}</h3>
                    </div>
                    
                    <div className="ml-11">
                      <p className="text-gray-700 mb-4 font-medium">{recommendation.explanation}</p>
                      
                      {recommendation.steps && recommendation.steps.length > 0 && (
                        <div className="mt-4 bg-white p-4 rounded-lg border border-blue-100">
                          <h4 className="text-md font-bold text-blue-700 mb-3">Implementation Steps:</h4>
                          <ol className="list-decimal list-inside space-y-3 text-gray-800">
                            {recommendation.steps.map((step, stepIndex) => (
                              <li key={stepIndex} className="pl-2">
                                <span className="font-medium">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="print-hidden flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-white text-[#7e43f1] border border-[#7e43f1] px-6 py-3 rounded-lg font-medium hover:bg-purple-50 transition-colors"
          >
            Back to Dashboard
          </button>
          
          {aiStatus === 'processing' ? (
            <button
              onClick={handleRefreshResults}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
              Refresh Results
            </button>
          ) : (
            <button
              onClick={handlePrint}
              className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] hover:from-[#7e43f1] hover:to-[#38b6ff] text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Download Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to format category names
function formatCategoryName(category: string): string {
  return category
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
}