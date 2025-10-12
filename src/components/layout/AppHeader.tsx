
'use client';

import { UserNav } from '@/components/auth/UserNav';
import { usePathname } from 'next/navigation';
import { useUser } from '@/firebase';
import { Skeleton } from '../ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Button } from '../ui/button';
import { PanelLeft } from 'lucide-react';
import { useSidebar } from '../ui/sidebar';
import { Logo } from '../Logo';
import { NavLink } from './AppSidebar'; // Import NavLink
import {
  LayoutDashboard,
  Wallet,
  FileUp,
  CircleUser,
  ArrowRightLeft,
  Briefcase,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
  { href: '/expenses', icon: <ArrowRightLeft className="h-5 w-5" />, label: 'Transactions' },
  { href: '/accounts', icon: <Wallet className="h-5 w-5" />, label: 'Accounts' },
  { href: '/shared-expenses', icon: <Briefcase className="h-5 w-5" />, label: 'Shared Expenses' },
  { href: '/import', icon: <FileUp className="h-5 w-5" />, label: 'Import' },
  { href: '/profile', icon: <CircleUser className="h-5 w-5" />, label: 'Profile' },
];


function getPageTitle(path: string): string {
    const title = path.split('/').pop()?.replace(/-/g, ' ');
    if (path.includes('/shared-expenses/') && path.split('/').length > 3) {
        return "Shared Space";
    }
    return title ? title.charAt(0).toUpperCase() + title.slice(1) : 'Dashboard';
}

// Wrapper component to handle closing the sidebar on mobile
const MobileNavLink = ({ children, onClick }: { children: React.ReactNode, onClick: () => void }) => {
    return (
        <div onClick={onClick} className="w-full">
            {children}
        </div>
    );
}

export function AppHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const { isUserLoading } = useUser();
  const { setOpenMobile } = useSidebar();
    
  const handleLinkClick = () => {
    setOpenMobile(false);
  }

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
                              <MobileNavLink key={item.href} onClick={handleLinkClick}>
                                <NavLink
                                    href={item.href}
                                    icon={item.icon}
                                    label={item.label}
                                    isActive={pathname.startsWith(item.href)}
                                    disabled={item.disabled}
                                />
                              </MobileNavLink>
                            ))}
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
