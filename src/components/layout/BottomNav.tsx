'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  BarChartHorizontal,
  Plus,
  MoreHorizontal,
  Briefcase,
  Repeat,
  HandCoins,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { AddExpenseDialog } from '@/components/expenses/AddExpenseDialog';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';

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

const NavLink = ({ href, currentPath, children, className, onClick }: { href: string; currentPath: string; children: React.ReactNode; className?: string; onClick?: () => void; }) => {
    const isActive = currentPath.startsWith(href);
    return (
        <Link href={href} className={cn("flex flex-col items-center justify-center gap-1 text-xs font-medium w-16 h-full transition-colors", isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary', className)} onContextMenu={(e) => e.preventDefault()} onClick={onClick}>
            {children}
        </Link>
    )
};


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
    <div ref={navRef} className="fixed bottom-4 left-0 right-0 z-40 px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="relative mx-auto w-full max-w-sm">

            {/* Secondary Nav - Appears Above */}
             <div className={cn(
                "transition-all duration-200 ease-in-out w-full mb-2",
                isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            )}>
                 <div className="bg-background/95 backdrop-blur-md rounded-xl shadow-lg ring-1 ring-black/5 flex justify-around items-center h-16">
                    {secondaryNavItems.map(({ href, icon: Icon, label }) => (
                         <NavLink key={href} href={href} currentPath={pathname} className="w-20" onClick={() => setIsExpanded(false)}>
                            <Icon className="h-5 w-5" />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* Primary Nav Bar (Oval) */}
            <div className="relative bg-background/95 backdrop-blur-md rounded-full shadow-lg ring-1 ring-black/5 h-16 flex items-center justify-around">
                
                {/* Left side */}
                <div className="flex justify-around flex-1">
                     <NavLink href="/dashboard" currentPath={pathname}>
                        <LayoutDashboard className="h-5 w-5" />
                        <span>Dashboard</span>
                    </NavLink>
                    <NavLink href="/analysis" currentPath={pathname}>
                        <BarChartHorizontal className="h-5 w-5" />
                        <span>Analysis</span>
                    </NavLink>
                </div>

                {/* FAB Spacer */}
                <div className="w-20 flex-shrink-0" />

                {/* Right side */}
                 <div className="flex justify-around flex-1">
                    <NavLink href="/accounts" currentPath={pathname}>
                        <Wallet className="h-5 w-5" />
                        <span>Accounts</span>
                    </NavLink>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={cn(
                        'flex flex-col items-center justify-center gap-1 text-xs font-medium w-16 h-full transition-colors',
                        isExpanded ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                        )}
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        {isExpanded ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
                        <span>{isExpanded ? 'Close' : 'More'}</span>
                    </button>
                </div>
            </div>
            
            {/* FAB Container - Positioned relative to the primary bar */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 -translate-y-1/2 z-10">
                 {isTransactionsPage ? (
                    <AddExpenseDialog onSaveSuccess={handleDataChange}>
                        <Button
                            size="icon"
                            className="h-16 w-16 rounded-full bg-primary shadow-lg"
                            onContextMenu={(e) => e.preventDefault()}
                        >
                            <Plus className="h-7 w-7" />
                            <span className="sr-only">Add Transaction</span>
                        </Button>
                    </AddExpenseDialog>
                ) : (
                    <Button
                        size="icon"
                        className="h-16 w-16 rounded-full bg-primary shadow-lg"
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

        </div>
    </div>
  );
}
