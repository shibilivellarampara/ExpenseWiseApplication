
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
    { href: '/debts', icon: HandCoins, label: 'Debts'},
    { href: '/assets', icon: Briefcase, label: 'Assets'},
    { href: '/recurring', icon: Repeat, label: 'Recurring'},
    { href: '/profile', icon: Settings, label: 'Settings'},
];

const NavLink = ({ href, currentPath, children }: { href: string; currentPath: string; children: React.ReactNode; }) => {
    const isActive = href === '/transactions' 
        ? currentPath.startsWith('/transactions') || currentPath.startsWith('/expenses')
        : currentPath.startsWith(href);
        
    return (
        <Link href={href} className={cn("flex flex-col items-center justify-center gap-1 font-medium w-16 h-full transition-colors", isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary')} onContextMenu={(e) => e.preventDefault()}>
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
    <div ref={navRef} className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom))' }}>
        <div className="relative mx-auto w-full">
            
            {/* Secondary Navigation Row */}
            <div
                className={cn(
                    "flex justify-around items-center bg-background/95 backdrop-blur-md border-x border-t rounded-t-2xl h-16 transition-all duration-200 ease-in-out",
                    "py-1", // Reduced vertical padding
                    isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none"
                )}
                style={{ borderBottomLeftRadius: '0px', borderBottomRightRadius: '0px' }}
            >
                {secondaryNavItems.map(({ href, icon: Icon, label }) => (
                    <Link key={href} href={href} className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-primary transition-colors h-full w-16" onClick={() => setIsExpanded(false)}>
                        <Icon className="h-4 w-4" /> 
                        <span className="text-xs">{label}</span>
                    </Link>
                ))}
            </div>

            {/* Primary Navigation Container */}
            <div className="relative h-16">
                 <div className="absolute inset-0 bg-background/95 backdrop-blur-md rounded-full shadow-lg ring-1 ring-black/5 flex items-center">
                    <div className="flex justify-around flex-1">
                        <NavLink href="/dashboard" currentPath={pathname}>
                            <LayoutDashboard className="h-5 w-5" />
                            <span className="text-xs">Dashboard</span>
                        </NavLink>
                        <NavLink href="/analysis" currentPath={pathname}>
                            <BarChartHorizontal className="h-5 w-5" />
                            <span className="text-xs">Analysis</span>
                        </NavLink>
                    </div>

                    <div className="w-20 flex-shrink-0" />

                    <div className="flex justify-around flex-1">
                        <NavLink href="/accounts" currentPath={pathname}>
                            <Wallet className="h-5 w-5" />
                            <span className="text-xs">Accounts</span>
                        </NavLink>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={cn(
                            'flex flex-col items-center justify-center gap-1 font-medium w-16 h-full transition-colors',
                            isExpanded ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                            )}
                            onContextMenu={(e) => e.preventDefault()}
                        >
                            <MoreHorizontal className={cn("h-5 w-5 transition-transform", isExpanded && "rotate-180")} />
                            <span className="text-xs">More</span>
                        </button>
                    </div>
                </div>
            
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[75%] h-[72px] w-[72px] flex items-center justify-center z-10">
                    {isTransactionsPage ? (
                    <AddExpenseDialog onSaveSuccess={handleDataChange}>
                        <Button
                            size="icon"
                            className="h-[72px] w-[72px] rounded-full bg-primary shadow-lg border-4 border-background"
                            onContextMenu={(e) => e.preventDefault()}
                        >
                            <Plus className="h-8 w-8" />
                            <span className="sr-only">Add Transaction</span>
                        </Button>
                    </AddExpenseDialog>
                ) : (
                    <Button
                        size="icon"
                        className="h-[72px] w-[72px] rounded-full bg-primary shadow-lg border-4 border-background"
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
    </div>
  );
}
