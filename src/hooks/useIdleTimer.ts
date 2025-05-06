'use client';

import { useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';

type UseIdleTimerOptions = {
  timeout?: number;
  onIdle?: () => void;
  debounce?: number;
};

export default function useIdleTimer({
  timeout = 7200000, // 2 hours in milliseconds
  onIdle = () => signOut({ callbackUrl: '/login' }),
  debounce = 500,
}: UseIdleTimerOptions = {}) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Function to reset the timer
  const resetTimer = () => {
    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout
    timeoutRef.current = setTimeout(() => {
      // User has been idle for the specified time, trigger the idle callback
      console.log('User inactive for specified duration, logging out');
      onIdle();
    }, timeout);

    // Store the last activity time in localStorage
    localStorage.setItem('lastActivityTime', Date.now().toString());
  };

  // Debounced function to handle user activity
  const handleUserActivity = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      resetTimer();
    }, debounce);
  };

  useEffect(() => {
    // Events to track user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
    ];

    // Check if session should already be expired based on stored timestamp
    const lastActivity = localStorage.getItem('lastActivityTime');
    if (lastActivity) {
      const lastActivityTime = parseInt(lastActivity, 10);
      const now = Date.now();
      
      if (now - lastActivityTime > timeout) {
        console.log('Session already expired based on stored timestamp');
        onIdle();
        return;
      }
    }

    // Initial timer reset
    resetTimer();

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    // Cleanup on unmount
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
  }, [timeout, onIdle, debounce]);
}