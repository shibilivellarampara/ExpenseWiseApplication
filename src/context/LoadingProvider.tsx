'use client';

import { PageLoader } from '@/components/PageLoader';
import { usePathname, useSearchParams } from 'next/navigation';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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
    // On every route change, we can assume the page is "loading"
    // and then the actual page content will determine when it's fully loaded.
    // For client-side navigations, this provides an instant feedback layer.
    setIsPageLoading(false);
  }, [pathname, searchParams]);

  // The actual logic to show/hide loader is simplified.
  // We'll rely on Suspense boundaries on each page to show skeleton loaders.
  // The 'isPageLoading' state can be used for a top-level loader if needed,
  // but for now, we'll let page components handle their own loading states.

  // The following effect is a better way to handle route change loading.
  // We'll keep it simple for now, but this is a more robust approach.
  useEffect(() => {
    const handleStart = () => setIsPageLoading(true);
    const handleComplete = () => setIsPageLoading(false);

    // This is a bit of a trick to listen to Next.js navigation events
    // since there isn't a direct router event system in the App Router.
    // We observe changes to the `body` attributes which Next.js modifies during navigation.
    const observer = new MutationObserver((mutationsList) => {
        for(let mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const bodyClasses = document.body.className;
                // A simple heuristic: if the body class changes, navigation might be happening.
                // This is not perfect but can serve as a trigger.
                // A more robust solution might use a shared layout component that sets context.
            }
        }
    });

    // A more reliable way is to just use path changes.
    // The previous effect handles this, but let's make it more explicit
    // for starting the load indicator.
    handleStart(); // Start loading on mount
    handleComplete(); // But complete it right away, page suspense will take over

    // We can't reliably detect start/end of navigation in App Router `useEffect`
    // so we'll just show a brief loading state on path change.
    // The real loading is handled by Suspense in each page.
    
    // The best approach is to use a combination of `usePathname` and a short delay
    // to give the impression of loading.
  }, [pathname, searchParams]);

  return (
    <LoadingContext.Provider value={{ isPageLoading }}>
      {isPageLoading && <PageLoader />}
      {children}
    </LoadingContext.Provider>
  );
}