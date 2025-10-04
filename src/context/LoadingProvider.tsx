'use client';

import { PageLoader } from '@/components/PageLoader';
import { usePathname, useSearchParams } from 'next/navigation';
import { createContext, useContext, useEffect, useState, ReactNode, startTransition } from 'react';

interface LoadingContextType {
  isPageLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPageLoading, setIsPageLoading] = useState(false);

  useEffect(() => {
    // This effect is now simplified to prevent infinite loops.
    // The actual loading state is primarily handled by Suspense boundaries on each page.
    // We can use this for a top-level loader if needed, but for now, we'll keep it minimal.
    // Setting it to false ensures that any lingering loading state is cleared on navigation.
    setIsPageLoading(false);
  }, [pathname, searchParams]);


  return (
    <LoadingContext.Provider value={{ isPageLoading }}>
      {isPageLoading && <PageLoader />}
      {children}
    </LoadingContext.Provider>
  );
}
