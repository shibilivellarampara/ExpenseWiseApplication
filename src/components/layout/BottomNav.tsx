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
  HandCoins,
  Briefcase,
  Repeat,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { AddExpenseDialog } from '@/components/expenses/AddExpenseDialog';
import { Button } from '@/components/ui/button';

const triggerHaptic = () => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(8);
  }
};

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
            onClick={triggerHaptic}
            className={cn(
                "flex flex-col items-center justify-center gap-1 font-medium w-16 h-full transition-all duration-300 ease-in-out pointer-events-auto",
                isActive ? 'text-primary scale-110' : 'text-muted-foreground/80 hover:text-primary'
            )} 
        >
            <div className={cn("transition-transform duration-300 ease-in-out", isActive && "drop-shadow-[0_0_12px_hsl(var(--primary)/0.5)]")}>
                {icon}
            </div>
            <span className={cn("text-[9px] font-bold uppercase tracking-wider", isActive && "opacity-100", !isActive && "opacity-60")}>{label}</span>
        </Link>
    )
};

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    const scrollContainer = document.getElementById('main-content');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsScrollingDown(true);
      } else {
        setIsScrollingDown(false);
      }
      setLastScrollY(currentScrollY);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleDataChange = () => {};
  
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
            
            {/* Secondary Navigation Row (Liquid Glass) */}
            <div
                className={cn(
                    "flex justify-around items-center bg-white/15 dark:bg-black/30 backdrop-blur-2xl border border-white/30 dark:border-white/10 rounded-full h-16 transition-all duration-500 ease-in-out py-1 mb-4 pointer-events-auto",
                    isExpanded ? "opacity-100 translate-y-0 scale-100 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.2)]" : "opacity-0 translate-y-10 scale-95 pointer-events-none shadow-none"
                )}
            >
                {secondaryNavItems.map(({ href, icon: Icon, label }) => (
                     <Link 
                        key={href} 
                        href={href} 
                        onClick={() => { triggerHaptic(); setIsExpanded(false); }}
                        className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-primary transition-all duration-200 h-full w-16"
                    >
                        <Icon className="h-5 w-5" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
                    </Link>
                ))}
            </div>

            {/* Primary Navigation Container (Liquid Glass with Deep Depth Shadow) */}
             <div className="relative h-16 pointer-events-auto">
                <div className="absolute inset-0 bg-white/15 dark:bg-black/30 backdrop-blur-2xl rounded-full shadow-[0_30px_60px_-12px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.25)] border border-white/40 dark:border-white/10 flex items-center justify-around px-4">
                    <NavLink href="/dashboard" currentPath={pathname}>
                        <LayoutDashboard className="h-6 w-6" />
                        <span>Dashboard</span>
                    </NavLink>
                    <NavLink href="/analysis" currentPath={pathname}>
                        <BarChartHorizontal className="h-6 w-6" />
                        <span>Analysis</span>
                    </NavLink>
                    
                    <div className="w-20" /> 

                    <NavLink href="/accounts" currentPath={pathname}>
                        <Wallet className="h-6 w-6" />
                        <span>Accounts</span>
                    </NavLink>
                    <button
                        onClick={() => { triggerHaptic(); setIsExpanded(!isExpanded); }}
                        className={cn(
                        'flex flex-col items-center justify-center gap-1 font-medium w-16 h-full transition-all duration-300 pointer-events-auto focus:outline-none',
                        isExpanded ? 'text-primary scale-110' : 'text-muted-foreground/80 hover:text-primary'
                        )}
                    >
                        <MoreHorizontal className={cn("h-6 w-6 transition-transform duration-500", isExpanded && "rotate-180")} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">More</span>
                    </button>
                </div>
            
                {/* Liquid Action Button (with Scroll-Aware Scaling & Elevation) */}
                <div className={cn(
                    "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[75%] h-[72px] w-[72px] flex items-center justify-center z-10 pointer-events-auto transition-all duration-500",
                    isScrollingDown ? "scale-90 opacity-80 -translate-y-[60%]" : "scale-100 opacity-100"
                )}>
                     {isTransactionsPage ? (
                        <AddExpenseDialog onSaveSuccess={handleDataChange}>
                            <Button
                                size="icon"
                                onClick={triggerHaptic}
                                className={cn(
                                    "h-[72px] w-[72px] rounded-full bg-primary/95 backdrop-blur-xl border-4 border-white/40 dark:border-white/10 shadow-[0_30px_60px_-12px_hsl(var(--primary)/0.6),inset_0_1px_0_0_rgba(255,255,255,0.4)] active:scale-90 active:shadow-inner transition-all duration-300 focus-visible:ring-0 focus-visible:ring-offset-0",
                                    !isScrollingDown && "hover:shadow-[0_40px_80px_-12px_hsl(var(--primary)/0.7)]"
                                )}
                            >
                                <Plus className="h-9 w-9 text-primary-foreground drop-shadow-lg" />
                                <span className="sr-only">Add Transaction</span>
                            </Button>
                        </AddExpenseDialog>
                     ) : (
                        <Button
                            size="icon"
                            onClick={() => { triggerHaptic(); router.push(transactionsHref); }}
                            className={cn(
                                "h-[72px] w-[72px] rounded-full bg-primary/95 backdrop-blur-xl border-4 border-white/40 dark:border-white/10 shadow-[0_30px_60px_-12px_hsl(var(--primary)/0.6),inset_0_1px_0_0_rgba(255,255,255,0.4)] active:scale-90 active:shadow-inner transition-all duration-300 focus-visible:ring-0 focus-visible:ring-offset-0",
                                !isScrollingDown && "hover:shadow-[0_40px_80px_-12px_hsl(var(--primary)/0.7)]"
                            )}
                        >
                            <ArrowRightLeft className="h-8 w-8 text-primary-foreground drop-shadow-lg" />
                            <span className="sr-only">Go to Transactions</span>
                        </Button>
                     )}
                </div>
            </div>
        </div>
    </div>
  );
}
