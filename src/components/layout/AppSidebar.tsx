

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Wallet,
  FileUp,
  Settings,
  ArrowRightLeft,
  FileText,
  Info,
  BarChartHorizontal,
  HandCoins,
  ArrowRight,
  ArrowLeft,
  Users,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
const appVersion = "1.6.8";


const baseNavItems = [
  { href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
  { href: '/transactions', special_href: '/expenses', icon: <ArrowRightLeft className="h-5 w-5" />, label: 'Transactions' },
  { href: '/accounts', icon: <Wallet className="h-5 w-5" />, label: 'Accounts' },
  { href: '/analysis', icon: <BarChartHorizontal className="h-5 w-5" />, label: 'Analysis' },
  { href: '/debts', icon: <HandCoins className="h-5 w-5" />, label: 'Debts' },
  { href: '/data', icon: <FileUp className="h-5 w-5" />, label: 'Import / Export' },
  { href: '/profile', icon: <Settings className="h-5 w-5" />, label: 'Settings' },
  { href: '/about', icon: <Info className="h-5 w-5" />, label: 'About' },
];

export const NavLink = ({ href, icon, label, isActive, disabled, onClick }: { href: string, icon: React.ReactNode, label: string, isActive: boolean, disabled?: boolean, onClick?: () => void }) => {
  const { isMobile, setOpenMobile } = useSidebar();

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
    if (onClick) {
      onClick();
    }
  };

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

  if (disabled) {
    return <div className="cursor-not-allowed">{linkContent}</div>;
  }
  
  return (
    <Link href={href} passHref onClick={handleClick}>
      {linkContent}
    </Link>
  );
};


export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  
  const transactionGrouping = userProfile?.dashboardSettings?.transactionGrouping || 'daily';

  const navItems = baseNavItems.map(item => {
    if (item.label === 'Transactions') {
      const href = transactionGrouping === 'monthly' ? item.href : item.special_href;
      const isActive = transactionGrouping === 'monthly' ? pathname.startsWith(item.href) : pathname.startsWith(item.special_href!);
      return { ...item, href: href!, isActive: isActive };
    }
    if (item.label === 'Import / Export') {
        const isActive = pathname.startsWith('/import') || pathname.startsWith('/reports') || pathname.startsWith('/data');
        return { ...item, isActive: isActive, href: '/data' };
    }
    return { ...item, isActive: pathname.startsWith(item.href) };
  });

  return (
    <aside className="w-56 flex-shrink-0 hidden md:block">
        <div className="flex h-full flex-col bg-sidebar-background text-sidebar-foreground">
            <div className="p-4 border-b border-sidebar-border">
                <Logo />
            </div>
            <nav className="flex-grow space-y-2 mt-4 px-2">
                {navItems.map((item) => (
                <NavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    isActive={item.isActive}
                    disabled={(item as any).disabled}
                />
                ))}
            </nav>
            <div className="mt-auto p-4 text-center text-xs text-sidebar-muted-foreground">
                <Separator className='my-2 bg-sidebar-border' />
                <span>Version {appVersion}</span>
            </div>
        </div>
    </aside>
  );
}

    