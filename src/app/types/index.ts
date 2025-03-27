// app/types/index.ts
export interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    phone?: string | null;
    isAdmin: boolean;
    isAffiliate: boolean;
    affiliateCode?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    assessments?: Assessment[];
    affiliateStats?: AffiliateStats;
  }
  
  export interface Assessment {
    id: string;
    type: string;
    status: string;
    createdAt: Date;
    updatedAt?: Date;
    data?: any;
    price?: number;
    tier?: string;
    payment?: Payment | null;
    currentStep?: number;
    totalSteps?: number;
  }
  
  export interface Payment {
    id: string;
    status: string;
    method: string;
    amount: number;
    gatewayPaymentId?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  export interface AffiliateStats {
    id: string;
    totalReferrals: number;
    totalEarnings: number;
    totalPaid: number;
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  // Assessment types definitions with labels and descriptions
  export const assessmentTypes = [
    {
      id: 'fjrl',
      label: 'First Job Readiness Level',
      description: 'Ideal for fresh graduates and those entering the workforce',
      icon: '🚀',
      color: '#38b6ff'
    },
    {
      id: 'ijrl',
      label: 'Ideal Job Readiness Level',
      description: 'Find the perfect career match for your skills and personality',
      icon: '✨',
      color: '#7e43f1'
    },
    {
      id: 'cdrl',
      label: 'Career Development Readiness Level',
      description: 'Plan your growth path in your current career',
      icon: '📈',
      color: '#fcb3b3'
    },
    {
      id: 'ccrl',
      label: 'Career Comeback Readiness Level',
      description: 'Returning to work after a break? This assessment is for you',
      icon: '🔄',
      color: '#38b6ff'
    },
    {
      id: 'ctrl',
      label: 'Career Transition Readiness Level',
      description: 'Changing careers? Evaluate your transition readiness',
      icon: '🔀',
      color: '#7e43f1'
    },
    {
      id: 'rrl',
      label: 'Retirement Readiness Level',
      description: 'Plan your retirement transition effectively',
      icon: '🌴',
      color: '#fcb3b3'
    },
    {
      id: 'irl',
      label: 'Internship Readiness Level',
      description: 'Prepare for successful internship experiences',
      icon: '🎓',
      color: '#38b6ff'
    }
  ];