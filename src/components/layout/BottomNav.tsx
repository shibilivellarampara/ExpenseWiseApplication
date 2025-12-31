
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-transparent" style={{ pointerEvents: 'none' }}>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex h-16 items-center justify-around rounded-full bg-background/80 shadow-lg ring-1 ring-black/5 backdrop-blur-md" style={{ pointerEvents: 'auto' }}>
            {baseNavItems.map(({ href, icon: Icon, label }) => {
                 if (href === 'DYNAMIC_ITEM') {
                    return (
                        <div key="fab" className="relative -top-6">
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
                    );
                 }

                if (label === 'More') {
                    return (
                        <TooltipProvider key="more-tooltip">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <MoreSheet>
                                        <div className="flex flex-col items-center justify-center gap-1 text-xs font-medium w-20 h-full text-muted-foreground cursor-pointer" onContextMenu={(e) => e.preventDefault()}>
                                            <Icon className="h-5 w-5" />
                                            <span>{label}</span>
                                        </div>
                                    </MoreSheet>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>More options</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
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
                        onContextMenu={(e) => e.preventDefault()}
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
