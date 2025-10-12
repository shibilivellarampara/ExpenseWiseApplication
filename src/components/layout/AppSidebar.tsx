
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Wallet,
  FileUp,
  CircleUser,
  ArrowRightLeft,
  Briefcase,
} from 'lucide-react';
import { Logo } from '../Logo';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { UserNav } from '../auth/UserNav';
import { Separator } from '../ui/separator';

const navItems = [
  { href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
  { href: '/expenses', icon: <ArrowRightLeft className="h-5 w-5" />, label: 'Transactions' },
  { href: '/accounts', icon: <Wallet className="h-5 w-5" />, label: 'Accounts' },
  { href: '/shared-expenses', icon: <Briefcase className="h-5 w-5" />, label: 'Shared Expenses' },
  { href: '/import', icon: <FileUp className="h-5 w-5" />, label: 'Import' },
  { href: '/profile', icon: <CircleUser className="h-5 w-5" />, label: 'Profile' },
];

const NavLink = ({ href, icon, label, isActive }: { href: string, icon: React.ReactNode, label: string, isActive: boolean }) => (
  <Link href={href} passHref>
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start text-base h-12 px-4 relative",
        isActive
          ? "bg-sidebar-active text-sidebar-active-foreground"
          : "text-sidebar-muted-foreground hover:bg-sidebar-active/20 hover:text-sidebar-foreground"
      )}
    >
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>}
      <div className="flex w-full items-center gap-4">
        {icon}
        <span>{label}</span>
      </div>
    </Button>
  </Link>
);

export function SidebarContent() {
    const pathname = usePathname();
    return (
        <div className="flex h-full flex-col bg-sidebar-background p-4 text-sidebar-foreground">
            <div className="py-4 px-2">
                <Logo />
            </div>
            <nav className="flex-grow space-y-2 mt-8">
                {navItems.map((item) => (
                <NavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    isActive={pathname.startsWith(item.href)}
                />
                ))}
            </nav>
            <div className="mt-auto">
                <Separator className='my-4 bg-sidebar-border' />
                
            </div>
        </div>
    )
}

export function AppSidebar() {
  return (
    <aside className="w-56 flex-shrink-0 hidden md:block">
        <SidebarContent />
    </aside>
  );
}
