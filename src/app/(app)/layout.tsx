'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Suspense } from 'react';
import { PageLoader } from '@/components/PageLoader';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { BottomNav } from '@/components/layout/BottomNav';
import { useMediaQuery } from '@/hooks/use-media-query';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const isMobile = useMediaQuery("(max-width: 768px)");

    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [user, firestore]);

    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    if (!userProfile) {
        return <PageLoader />;
    }

    const navigationStyle = userProfile.dashboardSettings?.navigationStyle || (isMobile ? 'bottom' : 'sidebar');

    const showSidebar = navigationStyle === 'sidebar' && !isMobile;
    const showBottomNav = navigationStyle === 'bottom' && isMobile;
    const showMobileSidebarButton = navigationStyle === 'sidebar' && isMobile;

    return (
        <div className="flex h-screen w-full bg-background">
            {showSidebar && <AppSidebar />}
            <div className="flex flex-1 flex-col overflow-hidden">
                <AppHeader showMobileSidebar={showMobileSidebarButton} />
                <main id="main-content" className="flex-1 overflow-y-auto" style={{ paddingBottom: showBottomNav ? '8rem' : '0' }}>
                    <div className="container mx-auto p-4 md:p-6 lg:p-8">
                        <Suspense fallback={<PageLoader />}>
                            {children}
                        </Suspense>
                    </div>
                </main>
                 {showBottomNav && <BottomNav />}
            </div>
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
        <SidebarProvider>
          <AppLayoutContent>{children}</AppLayoutContent>
        </SidebarProvider>
      </AuthGuard>
  );
}
