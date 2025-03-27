'use client';  // THIS LINE IS CRITICAL - marks as client component

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// Client component that handles session and interactions
export function AssessmentClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // If not authenticated, redirect to login
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/assessment');
      return;
    }
    
    // Continue with your code that needs the session
    if (status === 'authenticated') {
      setLoading(false);
      // Your authentication-dependent code here
    }
  }, [status, router]);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // Your assessment UI goes here
  return (
    <div>
      <h1>Assessment Page</h1>
      {/* All your assessment UI components */}
    </div>
  );
}