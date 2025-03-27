'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export function AssessmentTypeClient({ assessmentType }: { assessmentType: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Authentication check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/assessment/${assessmentType}`);
      return;
    }
    
    if (status === 'authenticated') {
      setLoading(false);
    }
  }, [status, router, assessmentType]);
  
  if (loading) return <div>Loading...</div>;
  
  // Your assessment type selection UI (packages/pricing)
  return (
    <div>
      <h1>{assessmentType.toUpperCase()} Assessment</h1>
      {/* Package selection, pricing, etc. */}
    </div>
  );
}