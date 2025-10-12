
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Wallet,
  FileUp,
  Settings,
  ArrowRightLeft,
  Briefcase,
} from 'lucide-react';
import { Logo } from '../Logo';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { useSidebar } from '../ui/sidebar';

const navItems = [
  { href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
  { href: '/expenses', icon: <ArrowRightLeft className="h-5 w-5" />, label: 'Transactions' },
  { href: '/accounts', icon: <Wallet className="h-5 w-5" />, label: 'Accounts' },
  { href: '/shared-expenses', icon: <Briefcase className="h-5 w-5" />, label: 'Shared Expenses' },
  { href: '/import', icon: <FileUp className="h-5 w-5" />, label: 'Import' },
  { href: '/profile', icon: <Settings className="h-5 w-5" />, label: 'Settings' },
];

export const NavLink = ({ href, icon, label, isActive, disabled }: { href: string, icon: React.ReactNode, label: string, isActive: boolean, disabled?: boolean }) => {
  const { isMobile, setOpenMobile } = useSidebar();

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false);
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
                    isActive={pathname.startsWith(item.href)}
                    disabled={(item as any).disabled}
                />
                ))}
            </nav>
            <div className="mt-auto">
                <Separator className='my-4 bg-sidebar-border' />
            </div>
        </div>
    </aside>
  );
}
