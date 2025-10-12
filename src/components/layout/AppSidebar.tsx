
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
  LogOut,
} from 'lucide-react';
import { Logo } from '../Logo';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
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
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-sidebar-active-foreground rounded-r-full"></div>}
      <div className="flex items-center gap-4">
        {icon}
        <span>{label}</span>
      </div>
    </Button>
  </Link>
);


export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-sidebar text-sidebar-foreground flex flex-col p-4">
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
        <UserNav />
      </div>
    </aside>
  );
}
