// /src/components/ui/NoHydrationWrapper.tsx
'use client';

import { useEffect, useState } from 'react';

interface NoHydrationWrapperProps {
  children: React.ReactNode;
}

export default function NoHydrationWrapper({ children }: NoHydrationWrapperProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Return nothing on server
  }

  return <>{children}</>;
}