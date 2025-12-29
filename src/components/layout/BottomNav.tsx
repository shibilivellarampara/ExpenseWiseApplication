
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { AddExpenseDialog } from '@/components/expenses/AddExpenseDialog';
import { Button } from '@/components/ui/button';
import { MoreSheet } from './MoreSheet';

const baseNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/analysis', icon: BarChartHorizontal, label: 'Analysis' },
  // Placeholder for the dynamic item
  { href: 'DYNAMIC_ITEM', icon: Plus, label: 'Add' },
  { href: '/accounts', icon: Wallet, label: 'Accounts' },
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

  const handleDataChange = () => {
    // Placeholder for AddExpenseDialog onSaveSuccess
  };

  const transactionGrouping = userProfile?.dashboardSettings?.transactionGrouping || 'daily';
  const transactionsHref = transactionGrouping === 'monthly' ? '/transactions' : '/expenses';
  const isTransactionsPage = pathname.startsWith('/expenses') || pathname.startsWith('/transactions');

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center md:hidden">
        <div className="relative flex h-16 items-center justify-around rounded-full bg-background/80 shadow-lg ring-1 ring-black/5 backdrop-blur-md">
            {baseNavItems.map(({ href, icon: Icon, label }) => {
                 if (href === 'DYNAMIC_ITEM') {
                    if (isTransactionsPage) {
                        return (
                             <div key="fab" className="relative -top-6">
                                <AddExpenseDialog onSaveSuccess={handleDataChange}>
                                    <Button
                                        size="icon"
                                        className="h-16 w-16 rounded-full bg-primary shadow-lg ring-4 ring-background"
                                    >
                                        <Plus className="h-7 w-7" />
                                        <span className="sr-only">Add Transaction</span>
                                    </Button>
                                </AddExpenseDialog>
                            </div>
                        )
                    }
                    // On other pages, show a link to the transactions page
                    return (
                        <Link
                            key="transactions-link"
                            href={transactionsHref}
                            className={cn(
                                'flex flex-col items-center justify-center gap-1 text-xs font-medium w-20 h-full transition-colors',
                                isTransactionsPage
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-primary'
                            )}
                        >
                            <ArrowRightLeft className="h-5 w-5" />
                            <span>Transactions</span>
                        </Link>
                    )
                 }

                if (label === 'More') {
                    return (
                        <MoreSheet key="more-sheet">
                            <div className="flex flex-col items-center justify-center gap-1 text-xs font-medium w-20 h-full text-muted-foreground">
                                <Icon className="h-5 w-5" />
                                <span>{label}</span>
                            </div>
                        </MoreSheet>
                    );
                }
                
                const finalHref = href;
                const isActive = pathname.startsWith(finalHref);

                return (
                    <Link
                        key={href}
                        href={finalHref}
                        className={cn(
                            'flex flex-col items-center justify-center gap-1 text-xs font-medium w-20 h-full transition-colors',
                            isActive
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-primary'
                        )}
                    >
                        <Icon className="h-5 w-5" />
                        <span>{label}</span>
                    </Link>
                );
            })}
        </div>
    </div>
  );
}
