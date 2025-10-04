'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserNav } from '@/components/auth/UserNav';
import { usePathname } from 'next/navigation';

function getPageTitle(path: string): string {
    switch (path) {
        case '/dashboard':
            return 'Dashboard';
        case '/expenses':
            return 'Expenses';
        case '/contributions':
            return 'Contributions';
        case '/import':
            return 'Import Expenses';
        case '/profile':
            return 'User Profile';
        default:
            return 'ExpenseWise';
    }
}

export function AppHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <h1 className="text-xl font-semibold font-headline">{title}</h1>
      <div className="ml-auto flex items-center gap-4">
        <UserNav />
      </div>
    </header>
  );
}
