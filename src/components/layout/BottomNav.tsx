
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  BarChartHorizontal,
  MoreHorizontal,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { AddExpenseDialog } from '@/components/expenses/AddExpenseDialog';
import { Button } from '@/components/ui/button';
import { MoreOptionsDrawer } from './MoreOptionsDrawer';


const mainNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/expenses', icon: ArrowRightLeft, label: 'Transactions' },
  { href: 'FAB', icon: Plus, label: 'Add' }, // Placeholder for the Floating Action Button
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

  const transactionGrouping = userProfile?.dashboardSettings?.transactionGrouping || 'daily';
  
  const handleDataChange = () => {
    // Placeholder for AddExpenseDialog onSaveSuccess
  };

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center md:hidden">
        <div className="relative flex h-16 items-center justify-around rounded-full bg-background/80 shadow-lg ring-1 ring-black/5 backdrop-blur-md">
            {mainNavItems.map(({ href, icon: Icon, label }) => {
                 if (label === 'Add') {
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
                    );
                }

                if (label === 'More') {
                    return (
                        <MoreOptionsDrawer key="more-drawer">
                            <div
                                className={cn(
                                    'flex flex-col items-center justify-center gap-1 text-xs font-medium w-20 h-full transition-colors',
                                    pathname.startsWith('/debts') || pathname.startsWith('/data') || pathname.startsWith('/profile') || pathname.startsWith('/about')
                                        ? 'text-primary'
                                        : 'text-muted-foreground hover:text-primary'
                                )}
                            >
                                <Icon className="h-5 w-5" />
                                <span>{label}</span>
                            </div>
                        </MoreOptionsDrawer>
                    )
                }

                const finalHref = label === 'Transactions' 
                    ? (transactionGrouping === 'monthly' ? '/transactions' : '/expenses') 
                    : href;
                
                const finalIsActive = pathname.startsWith(finalHref);


                return (
                    <Link
                        key={href}
                        href={finalHref}
                        className={cn(
                            'flex flex-col items-center justify-center gap-1 text-xs font-medium w-20 h-full transition-colors',
                            finalIsActive
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
