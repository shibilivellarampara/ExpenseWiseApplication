
'use client';

import { UserNav } from '@/components/auth/UserNav';
import { usePathname } from 'next/navigation';
import { useUser } from '@/firebase';
import { Skeleton } from '../ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { Button } from '../ui/button';
import { PanelLeft } from 'lucide-react';
import { SidebarContent } from './AppSidebar';


function getPageTitle(path: string): string {
    const title = path.split('/').pop()?.replace(/-/g, ' ');
    if (path.includes('/shared-expenses/') && path.split('/').length > 3) {
        return "Shared Space";
    }
    return title ? title.charAt(0).toUpperCase() + title.slice(1) : 'Dashboard';
}

export function AppHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const { isUserLoading } = useUser();

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 md:px-6 sticky top-0 z-30">
        
         <div className="md:hidden">
             <Sheet>
                <SheetTrigger asChild>
                    <Button size="icon" variant="ghost">
                        <PanelLeft />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64">
                    <SidebarContent />
                </SheetContent>
            </Sheet>
        </div>

        <div className="flex-1">
            <h1 className="font-semibold text-lg md:text-xl">{title}</h1>
        </div>
        
        {isUserLoading ? (
            <Skeleton className="h-10 w-10 rounded-full" />
        ) : (
            <UserNav />
        )}
    </header>
  );
}
