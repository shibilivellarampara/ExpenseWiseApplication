
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  BarChartHorizontal,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';

const mainNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/accounts', icon: Wallet, label: 'Accounts' },
  { href: '/transactions', special_href: '/expenses', icon: ArrowRightLeft, label: 'Transactions' },
  { href: '/analysis', icon: BarChartHorizontal, label: 'Analysis' },
  { href: '/more', icon: MoreHorizontal, label: 'More' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const transactionGrouping = userProfile?.dashboardSettings?.transactionGrouping || 'daily';

  const navItems = mainNavItems.map(item => {
    if (item.label === 'Transactions') {
      const href = transactionGrouping === 'monthly' ? item.href : item.special_href;
      const isActive = pathname === href || (item.special_href && pathname.startsWith(item.special_href)) || (item.href && pathname.startsWith(item.href));
      return { ...item, href: href!, isActive: isActive };
    }
     const isActive = pathname.startsWith(item.href);
     return { ...item, isActive, href: item.href };
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="container mx-auto grid h-16 grid-cols-5 items-center justify-items-center">
        {navItems.map(({ href, icon: Icon, label, isActive }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-xs font-medium w-full h-full transition-colors',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-primary'
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
