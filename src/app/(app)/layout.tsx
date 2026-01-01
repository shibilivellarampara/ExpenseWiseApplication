
'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { Suspense } from 'react';
import { PageLoader } from '@/components/PageLoader';
import { useMediaQuery } from '@/hooks/use-media-query';
import { BottomNav } from '@/components/layout/BottomNav';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
    const isMobile = useMediaQuery("(max-width: 768px)");

    return (
        <div className="flex h-screen w-full flex-col bg-background">
            <AppHeader />
            <main id="main-content" className="flex-1 overflow-y-auto pt-14 pb-24 md:pb-8">
                <div className="container mx-auto p-4 md:p-6 lg:p-8">
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
