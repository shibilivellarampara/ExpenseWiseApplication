
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  BarChartHorizontal,
  Plus,
  MoreHorizontal,
  Briefcase,
  Repeat,
  HandCoins,
  Settings,
  Notebook,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { AddExpenseDialog } from '@/components/expenses/AddExpenseDialog';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';

const primaryNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/analysis', icon: BarChartHorizontal, label: 'Analysis' },
];

const secondaryNavItems = [
    { href: '/assets', icon: Briefcase, label: 'Assets'},
    { href: '/recurring', icon: Repeat, label: 'Recurring'},
    { href: '/debts', icon: HandCoins, label: 'Debts'},
    { href: '/profile', icon: Settings, label: 'Settings'},
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const handleDataChange = () => {
    // Placeholder for AddExpenseDialog onSaveSuccess
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const transactionGrouping = userProfile?.dashboardSettings?.transactionGrouping || 'daily';
  const transactionsHref = transactionGrouping === 'monthly' ? '/transactions' : '/expenses';
  const isTransactionsPage = pathname.startsWith('/expenses') || pathname.startsWith('/transactions');

  return (
    <div
      ref={navRef}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 bg-background/80 shadow-lg ring-1 ring-black/5 backdrop-blur-md transition-[height] duration-200 ease-in-out',
        isExpanded ? 'h-36' : 'h-20'
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* FAB - Positioned relative to the main container */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-8 z-10">
         {isTransactionsPage ? (
            <AddExpenseDialog onSaveSuccess={handleDataChange}>
                <Button
                    size="icon"
                    className="h-16 w-16 rounded-full bg-primary shadow-lg ring-4 ring-background"
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <Plus className="h-7 w-7" />
                    <span className="sr-only">Add Transaction</span>
                </Button>
            </AddExpenseDialog>
        ) : (
            <Button
                size="icon"
                className="h-16 w-16 rounded-full bg-primary shadow-lg ring-4 ring-background"
                asChild
                onContextMenu={(e) => e.preventDefault()}
            >
                <Link href={transactionsHref}>
                    <ArrowRightLeft className="h-7 w-7" />
                    <span className="sr-only">Go to Transactions</span>
                </Link>
            </Button>
        )}
      </div>

      <div className="relative flex flex-col h-full justify-end">
        {/* Secondary Row (Top) - Expands */}
        <div
          className={cn(
            'flex items-center justify-around h-16 w-full px-2 transition-opacity duration-150',
            isExpanded ? 'opacity-100' : 'opacity-0'
          )}
        >
          {secondaryNavItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1 text-xs font-medium w-16 h-full text-muted-foreground"
              onClick={() => setIsExpanded(false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          ))}
        </div>

         {/* Separator - Only visible when expanded */}
        {isExpanded && <Separator className="bg-border/50" />}

        {/* Primary Row (Bottom) - Always visible */}
        <div className="flex h-16 items-center justify-around">
            {primaryNavItems.map(({ href, icon: Icon, label }) => (
                <Link
                    key={href}
                    href={href}
                    className={cn(
                        'flex flex-col items-center justify-center gap-1 text-xs font-medium w-20 h-full transition-colors',
                        pathname.startsWith(href)
                            ? 'text-primary'
                            : 'text-muted-foreground hover:text-primary'
                    )}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <Icon className="h-5 w-5" />
                    <span>{label}</span>
                </Link>
            ))}

            {/* Spacer for FAB */}
            <div className="w-20" /> 
            
            <Link
                href='/accounts'
                className={cn(
                    'flex flex-col items-center justify-center gap-1 text-xs font-medium w-20 h-full transition-colors',
                    pathname.startsWith('/accounts')
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-primary'
                )}
                onContextMenu={(e) => e.preventDefault()}
            >
                <Wallet className="h-5 w-5" />
                <span>Accounts</span>
            </Link>

            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    'flex flex-col items-center justify-center gap-1 text-xs font-medium w-20 h-full transition-colors',
                    isExpanded ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                )}
                onContextMenu={(e) => e.preventDefault()}
            >
                {isExpanded ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
                <span>{isExpanded ? 'Close' : 'More'}</span>
            </button>
        </div>
      </div>
    </div>
  );
}
