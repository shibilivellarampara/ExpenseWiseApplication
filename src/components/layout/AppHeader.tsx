
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
import { cn } from '@/lib/utils';
import Link from 'next/link';
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
  { href: '/shared-expenses', icon: <Briefcase className="h-5 w-5" />, label: 'Shared Expenses', disabled: true },
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


const NavLink = ({ href, icon, label, isActive, disabled, onClick }: { href: string, icon: React.ReactNode, label: string, isActive: boolean, disabled?: boolean, onClick?: () => void }) => {
  const linkContent = (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start text-base h-12 px-4 relative",
        isActive && !disabled
          ? "bg-sidebar-active text-sidebar-active-foreground"
          : "text-sidebar-muted-foreground hover:bg-sidebar-active/20 hover:text-sidebar-foreground",
        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-sidebar-muted-foreground"
      )}
      disabled={disabled}
      asChild={!disabled}
    >
      <div className="flex w-full items-center gap-4">
        {isActive && !disabled && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>}
        {icon}
        <span>{label}</span>
      </div>
    </Button>
  );

  return disabled ? (
    <div className="cursor-not-allowed">{linkContent}</div>
  ) : (
    <Link href={href} passHref onClick={onClick}>
      {linkContent}
    </Link>
  );
};


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
                          <SheetTitle className="sr-only">Main Menu</SheetTitle>
                          <Logo />
                        </SheetHeader>
                        <nav className="flex-grow space-y-2 mt-4 px-2">
                            {navItems.map((item) => (
                            <NavLink
                                key={item.href}
                                href={item.href}
                                icon={item.icon}
                                label={item.label}
                                isActive={pathname.startsWith(item.href)}
                                disabled={item.disabled}
                                onClick={handleLinkClick}
                            />
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
