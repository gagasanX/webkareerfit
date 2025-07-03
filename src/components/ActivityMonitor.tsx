'use client';

import { useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import useIdleTimer from '@/hooks/useIdleTimer';

export default function ActivityMonitor() {
  const { status, data: session } = useSession();
  
  // 🔥 ONLY enable for authenticated users and add session check
  const isEnabled = status === 'authenticated' && !!session;
  
  useIdleTimer({
    enabled: isEnabled,
    timeout: 3600000, // 1 hour instead of 2 hours
    onIdle: () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('User idle for 1 hour, logging out');
      }
      signOut({ callbackUrl: '/login?timeout=true' });
    },
    debounce: 2000, // Increased debounce
  });
  
  // 🔥 ADD CLEANUP on session changes
  useEffect(() => {
    if (status === 'unauthenticated') {
      // Clear any existing timers when user logs out
      if (process.env.NODE_ENV === 'development') {
        console.log('User logged out, cleaning up activity monitor');
      }
    }
  }, [status]);
  
  return null;
}