
'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useLoading } from '@/context/LoadingProvider';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isPageLoading } = useLoading();

  useEffect(() => {
    // This effect is to demonstrate how to use the loading context.
    // The actual loading state is controlled in the LoadingProvider.
  }, [pathname, searchParams]);

  return (
      <AuthGuard>
        <SidebarProvider>
          <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1 flex flex-col">
              <AppHeader />
              <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                {isPageLoading ? null : children}
              </div>
            </main>
          </div>
        </SidebarProvider>
      </AuthGuard>
  );
}
