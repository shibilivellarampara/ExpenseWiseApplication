
'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Suspense } from 'react';
import { PageLoader } from '@/components/PageLoader';


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
      <AuthGuard>
        <SidebarProvider>
          <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1 flex flex-col">
              <AppHeader />
              <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                <Suspense fallback={<PageLoader />}>
                  {children}
                </Suspense>
              </div>
            </main>
          </div>
        </SidebarProvider>
      </AuthGuard>
  );
}
