'use client';

import { useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';

type UseIdleTimerOptions = {
  timeout?: number;
  onIdle?: () => void;
  debounce?: number;
  enabled?: boolean;
};

export default function useIdleTimer({
  timeout = 3600000, // 🔥 REDUCE TO 1 HOUR instead of 2 hours
  onIdle = () => signOut({ callbackUrl: '/login' }),
  debounce = 2000, // 🔥 INCREASE DEBOUNCE to reduce frequency
  enabled = true,
}: UseIdleTimerOptions = {}) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (!enabled) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log('User inactive, logging out');
      }
      onIdle();
    }, timeout);

    // 🔥 REMOVE localStorage usage - cause browser cache conflicts
    // localStorage.setItem('lastActivityTime', Date.now().toString());
  };

  const handleUserActivity = () => {
    if (!enabled) return;
    
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      resetTimer();
    }, debounce);
  };

  useEffect(() => {
    if (!enabled) return;
    
    // 🔥 REDUCE EVENT LISTENERS - Remove frequent ones like mousemove, scroll
    const events = [
      'click',
      'keydown',
      'touchstart',
      // Removed: 'mousedown', 'mousemove', 'keypress', 'scroll'
    ];

    // 🔥 REMOVE localStorage check - cause session conflicts
    // const lastActivity = localStorage.getItem('lastActivityTime');
    // if (lastActivity) {
    //   const lastActivityTime = parseInt(lastActivity, 10);
    //   const now = Date.now();
    //   
    //   if (now - lastActivityTime > timeout) {
    //     console.log('Session already expired based on stored timestamp');
    //     onIdle();
    //     return;
    //   }
    // }

    resetTimer();

    // Add event listeners with passive option for better performance
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [timeout, onIdle, debounce, enabled]);
  
  return null;
}