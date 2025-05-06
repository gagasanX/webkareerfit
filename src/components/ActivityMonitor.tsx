'use client';

import { useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import useIdleTimer from '@/hooks/useIdleTimer';

export default function ActivityMonitor() {
  const { status } = useSession();
  
  // Always call the hook, but conditionally enable its functionality
  useIdleTimer({
    enabled: status === 'authenticated',
    timeout: 7200000, // 2 hours
    onIdle: () => {
      console.log('User idle for 2 hours, logging out');
      signOut({ callbackUrl: '/login?timeout=true' });
    }
  });
  
  // This component doesn't render anything
  return null;
}