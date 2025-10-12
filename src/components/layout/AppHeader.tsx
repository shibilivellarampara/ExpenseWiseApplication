'use client';

import { UserNav } from '@/components/auth/UserNav';
import { usePathname } from 'next/navigation';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Skeleton } from '../ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Button } from '../ui/button';
import { PanelLeft, Shield } from 'lucide-react';
import { Logo } from '../Logo';
import { NavLink } from './AppSidebar';
import {
  LayoutDashboard,
  Wallet,
  FileUp,
  Settings,
  ArrowRightLeft,
  Briefcase,
} from 'lucide-react';
import { doc } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';


const navItems = [
  { href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
  { href: '/expenses', icon: <ArrowRightLeft className="h-5 w-5" />, label: 'Transactions' },
  { href: '/accounts', icon: <Wallet className="h-5 w-5" />, label: 'Accounts' },
  { href: '/shared-expenses', icon: <Briefcase className="h-5 w-5" />, label: 'Shared Expenses' },
  { href: '/import', icon: <FileUp className="h-5 w-5" />, label: 'Import' },
  { href: '/profile', icon: <Settings className="h-5 w-5" />, label: 'Settings' },
];

const adminNavItem = { href: '/admin', icon: <Shield className="h-5 w-5" />, label: 'Admin', admin: true };


function getPageTitle(path: string): string {
    if (path.startsWith('/admin')) return 'Admin';
    if (path.startsWith('/profile')) return 'Settings';
    const title = path.split('/').pop()?.replace(/-/g, ' ');
    if (path.includes('/shared-expenses/') && path.split('/').length > 3) {
        return "Shared Space";
    }
    return title ? title.charAt(0).toUpperCase() + title.slice(1) : 'Dashboard';
}

export function AppHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    
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
                    <div className="flex h-full flex-col bg-sidebar-background text-sidebar-foreground">
                        <SheetHeader className="p-4 border-b border-sidebar-border">
                          <SheetTitle>
                            <Logo />
                          </SheetTitle>
                        </SheetHeader>
                        <nav className="flex-grow space-y-2 mt-4 px-2">
                            {navItems.map((item) => (
                              <NavLink
                                  key={item.href}
                                  href={item.href}
                                  icon={item.icon}
                                  label={item.label}
                                  isActive={pathname.startsWith(item.href)}
                                  disabled={(item as any).disabled}
                              />
                            ))}
                             {userProfile?.isAdmin && (
                                <NavLink
                                    key={adminNavItem.href}
                                    href={adminNavItem.href}
                                    icon={adminNavItem.icon}
                                    label={adminNavItem.label}
                                    isActive={pathname.startsWith(adminNavItem.href)}
                                />
                            )}
                        </nav>
                        <div className="mt-auto">
                            <div className='my-4 bg-sidebar-border' />
                        </div>
                    </div>
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
