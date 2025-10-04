'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserNav } from '@/components/auth/UserNav';
import { usePathname } from 'next/navigation';
import { useUser } from '@/firebase';
import { Skeleton } from '../ui/skeleton';

function getPageTitle(path: string): string {
    const title = path.split('/').pop()?.replace(/-/g, ' ');
    return title ? title.charAt(0).toUpperCase() + title.slice(1) : 'Dashboard';
}

export function AppHeader() {
  const pathname = usePathname();
  const title = getPageT