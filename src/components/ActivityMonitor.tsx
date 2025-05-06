'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import useIdleTimer from '@/hooks/useIdleTimer';

export default function ActivityMonitor() {
  const { status } = useSession();
  const [timeoutEnabled, setTimeoutEnabled] = useState(false);
  
  // Only enable the idle timer if the user is authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      setTimeoutEnabled(true);
    } else {
      setTimeoutEnabled(false);
    }
  }, [status]);
  
  // Use the idle timer hook when timeout is enabled
  if (timeoutEnabled) {
    useIdleTimer({
      timeout: 7200000, // 2 hours in milliseconds
      onIdle: () => {
        console.log('User idle for 2 hours, logging out');
        signOut({ callbackUrl: '/login?timeout=true' });
      }
    });
  }
  
  // This component doesn't render anything
  return null;
}