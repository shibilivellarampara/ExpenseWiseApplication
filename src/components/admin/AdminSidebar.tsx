'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users
} from 'lucide-react';
import { Logo } from '../Logo';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { useSidebar } from '../ui/sidebar';

const adminNavItems = [
  { href: '/admin', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Admin Dashboard' },
  { href: '/admin/users', icon: <Users className="h-5 w-5" />, label: 'User Management' },
];

export const NavLink = ({ href, icon, label, isActive }: { href: string, icon: React.ReactNode, label: string, isActive: boolean }) => {
  const { isMobile, setOpenMobile } = useSidebar();

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Link href={href} passHref onClick={handleClick}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start text-base h-12 px-4 relative",
          isActive
            ? "bg-sidebar-active text-sidebar-active-foreground"
            : "text-sidebar-muted-foreground hover:bg-sidebar-active/20 hover:text-sidebar-foreground"
        )}
        asChild
      >
        <div className="flex w-full items-center gap-4">
          {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>}
          {icon}
          <span>{label}</span>
        </div>
      </Button>
    </Link>
  );
};

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 hidden md:block">
        <div className="flex h-full flex-col bg-sidebar-background text-sidebar-foreground">
            <div className="p-4 border-b border-sidebar-border">
                <Logo />
            </div>
            <nav className="flex-grow space-y-2 mt-4 px-2">
                {adminNavItems.map((item) => (
                <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    isActive={pathname === item.href}
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
