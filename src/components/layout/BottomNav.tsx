'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { AddExpenseDialog } from '@/components/expenses/AddExpenseDialog';
import { Button } from '@/components/ui/button';

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
        
    const childrenArray = React.Children.toArray(children);
    const icon = childrenArray[0];
    const label = childrenArray[1];

    return (
        <Link 
            href={href} 
            className={cn(
                "flex flex-col items-center justify-center gap-1 font-medium w-16 h-full transition-colors duration-200 ease-in-out pointer-events-auto",
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            )} 
        >
            <div className={cn("transition-transform duration-200 ease-in-out", isActive && "scale-110")}>
                {icon}
            </div>
            <span className="text-xs">{label}</span>
        </Link>
    )
};

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
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
        className="fixed bottom-0 left-0 right-0 z-40 w-full max-w-lg mx-auto pointer-events-none" 
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
    >
        <div className="relative mx-auto w-full px-4">
            
            {/* Secondary Navigation Row */}
            <div
                className={cn(
                    "flex justify-around items-center bg-background/80 backdrop-blur-md border rounded-full h-16 transition-all duration-200 ease-in-out py-1 mb-2 pointer-events-auto",
                    isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none shadow-none"
                )}
                style={isExpanded ? { boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' } : {}}
            >
                {secondaryNavItems.map(({ href, icon: Icon, label }) => (
                     <Link key={href} href={href} className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-primary transition-colors h-full w-16" onClick={() => setIsExpanded(false)}>
                        <Icon className="h-5 w-5" />
                        <span className="text-xs">{label}</span>
                    </Link>
                ))}
            </div>

            {/* Primary Navigation Container */}
             <div className="relative h-16 pointer-events-auto">
                {/* Primary Oval Bar with Enhanced Depth */}
                <div className="absolute inset-0 bg-background/85 backdrop-blur-lg rounded-full shadow-[0_15px_35px_-10px_rgba(0,0,0,0.2),0_10px_15px_-5px_rgba(0,0,0,0.1)] border border-white/20 ring-1 ring-black/[0.03] flex items-center justify-around px-4">
                    <NavLink href="/dashboard" currentPath={pathname}>
                        <LayoutDashboard className="h-6 w-6" />
                        <span className="text-xs">Dashboard</span>
                    </NavLink>
                    <NavLink href="/analysis" currentPath={pathname}>
                        <BarChartHorizontal className="h-6 w-6" />
                        <span className="text-xs">Analysis</span>
                    </NavLink>
                    
                    <div className="w-20" /> 

                    <NavLink href="/accounts" currentPath={pathname}>
                        <Wallet className="h-6 w-6" />
                        <span className="text-xs">Accounts</span>
                    </NavLink>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={cn(
                        'flex flex-col items-center justify-center gap-1 font-medium w-16 h-full transition-colors pointer-events-auto focus:outline-none',
                        isExpanded ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                        )}
                    >
                        <MoreHorizontal className={cn("h-6 w-6 transition-transform", isExpanded && "rotate-180")} />
                        <span className="text-xs">More</span>
                    </button>
                </div>
            
                {/* Floating Action Button with Enhanced Depth */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[75%] h-[72px] w-[72px] flex items-center justify-center z-10 pointer-events-auto">
                     {isTransactionsPage ? (
                        <AddExpenseDialog onSaveSuccess={handleDataChange}>
                            <Button
                                size="icon"
                                className="h-[72px] w-[72px] rounded-full bg-primary border-4 border-background shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3),0_10px_20px_-5px_rgba(0,0,0,0.2)] active:shadow-[0_5px_15px_-3px_rgba(0,0,0,0.2)] active:scale-95 transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
                            >
                                <Plus className="h-8 w-8" />
                                <span className="sr-only">Add Transaction</span>
                            </Button>
                        </AddExpenseDialog>
                     ) : (
                        <Button
                            size="icon"
                            onClick={() => router.push(transactionsHref)}
                            className="h-[72px] w-[72px] rounded-full bg-primary border-4 border-background shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3),0_10px_20px_-5px_rgba(0,0,0,0.2)] active:shadow-[0_5px_15px_-3px_rgba(0,0,0,0.2)] active:scale-95 transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
                        >
                            <ArrowRightLeft className="h-7 w-7" />
                            <span className="sr-only">Go to Transactions</span>
                        </Button>
                     )}
                </div>
            </div>
        </div>
    </div>
  );
}
