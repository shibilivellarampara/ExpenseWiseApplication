
'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Suspense } from 'react';
import { PageLoader } from '@/components/PageLoader';
import { useMediaQuery } from '@/hooks/use-media-query';
import { BottomNav } from '@/components/layout/BottomNav';
import { cn } from '@/lib/utils';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
    const isMobile = useMediaQuery("(max-width: 768px)");

    return (
        <div className="flex h-dvh w-full flex-col bg-background">
            <AppHeader />
            <main id="main-content" className="flex-1 overflow-y-auto">
                <div className={cn("container mx-auto p-4 md:p-6 lg:p-8", isMobile && "pb-24")}>
                    <Suspense fallback={<PageLoader />}>
                        {children}
                    </Suspense>
                </div>
            </main>
            {isMobile && <BottomNav />}
        </div>
    );
}


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
      <AuthGuard>
          <AppLayoutContent>{children}</AppLayoutContent>
      </AuthGuard>
  );
}
