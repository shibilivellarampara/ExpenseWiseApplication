
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  X,
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
            onContextMenu={(e) => e.preventDefault()}
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
    <div ref={navRef} className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm pointer-events-none" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom))' }}>
        <div className="relative mx-auto w-full">
            
            {/* Secondary Navigation Row */}
            <div
                className={cn(
                    "flex justify-around items-center bg-background/80 backdrop-blur-md border rounded-full h-16 transition-all duration-200 ease-in-out py-1 mb-2 pointer-events-auto",
                    isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none"
                )}
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
                {/* Primary Oval Bar */}
                <div className="absolute inset-0 bg-background/80 backdrop-blur-md rounded-full shadow-[0_6px_12px_rgba(0,0,0,0.1)] ring-1 ring-black/5 flex items-center justify-around px-4">
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
                        'flex flex-col items-center justify-center gap-1 font-medium w-16 h-full transition-colors pointer-events-auto',
                        isExpanded ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                        )}
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <MoreHorizontal className={cn("h-6 w-6 transition-transform", isExpanded && "rotate-180")} />
                        <span className="text-xs">More</span>
                    </button>
                </div>
            
                {/* Floating Action Button */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[75%] h-[72px] w-[72px] flex items-center justify-center z-10 pointer-events-auto">
                     <AddExpenseDialog onSaveSuccess={handleDataChange}>
                        <Button
                            size="icon"
                            className={cn(
                                "h-[72px] w-[72px] rounded-full bg-primary border-4 border-background relative overflow-hidden",
                                "shadow-[0_4px_8px_rgba(0,0,0,0.1)]", 
                                !isTransactionsPage && "cursor-default"
                            )}
                            onClick={(e) => {
                                if (!isTransactionsPage) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                            }}
                            onContextMenu={(e) => e.preventDefault()}
                        >
                             <Link href={transactionsHref} className={cn("absolute inset-0 flex items-center justify-center transition-all duration-300", isTransactionsPage && "opacity-0 scale-0 rotate-180 pointer-events-none")}>
                                <ArrowRightLeft className="h-7 w-7" />
                            </Link>

                             <div className={cn("absolute inset-0 flex items-center justify-center transition-all duration-300", !isTransactionsPage && "opacity-0 scale-0 -rotate-180 pointer-events-none")}>
                                <Plus className="h-8 w-8" />
                            </div>
                            
                            <span className="sr-only">Add Transaction or Navigate</span>
                        </Button>
                    </AddExpenseDialog>
                </div>
            </div>
        </div>
    </div>
  );
}
