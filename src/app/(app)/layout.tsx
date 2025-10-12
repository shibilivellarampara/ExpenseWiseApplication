
'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Suspense } from 'react';
import { PageLoader } from '@/components/PageLoader';


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
      <AuthGuard>
          <div className="flex h-screen w-full bg-background">
            <AppSidebar />
            <div className="flex flex-1 flex-col">
              <AppHeader />
              <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto p-4 md:p-6 lg:p-8">
                  <Suspense fallback={<PageLoader />}>
                    {children}
                  </Suspense>
                </div>
              </main>
            </div>
          </div>
      </AuthGuard>
  );
}
