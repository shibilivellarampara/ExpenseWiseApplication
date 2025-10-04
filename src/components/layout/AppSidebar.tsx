'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Wallet,
  Users,
  FileUp,
  CircleUser,
  ArrowRightLeft
} from 'lucide-react';
import { Logo } from '../Logo';

const navItems = [
  { href: '/dashboard', icon: <LayoutDashboard />, label: 'Dashboard' },
  { href: '/expenses', icon: <ArrowRightLeft />, label: 'Transactions' },
  { href: '/accounts', icon: <Wallet />, label: 'Accounts' },
  { href: '/contributions', icon: <Users />, label: 'Contributions' },
  { href: '/import', icon: <FileUp />, label: 'Import' },
  { href: '/profile', icon: <CircleUser />, label: 'Profile' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    setOpenMobile(false);
  }

  return (
    <Sidebar className="border-r bg-card">
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref onClick={handleLinkClick}>
                <SidebarMenuButton
                  isActive={pathname.startsWith(item.href)}
                  className="w-full"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
