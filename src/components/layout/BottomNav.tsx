
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { AddExpenseDialog } from '@/components/expenses/AddExpenseDialog';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';

const secondaryNavItems = [
    { href: '/debts', icon: HandCoins, label: 'Debts'},
    { href: '/assets', icon: Briefcase, label: 'Assets'},
    { href: '/recurring', icon: Repeat, label: 'Recurring'},
    { href: '/profile', icon: Settings, label: 'Settings'},
];

const NavLink = ({ href, currentPath, children }: { href: string; currentPath: string; children: React.ReactNode; }) => {
    const isActive = currentPath.startsWith(href);
    return (
        <Link href={href} className={cn("flex flex-col items-center justify-center gap-1 text-xs font-medium w-16 h-full transition-colors", isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary')} onContextMenu={(e) => e.preventDefault()}>
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
    <div ref={navRef} className="fixed bottom-0 left-0 right-0 z-40 px-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
      <div className="relative mx-auto w-full max-w-sm">

        {/* Secondary Navigation Row (conditionally rendered) */}
        <div className={cn(
          "grid grid-cols-4 items-center bg-background/90 backdrop-blur-md border-t border-x border-border/50 rounded-t-2xl h-16 transition-all duration-200 ease-in-out",
          isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none"
        )}>
          {secondaryNavItems.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-primary transition-colors" onClick={() => setIsExpanded(false)}>
              <Icon className="h-4 w-4" />
              <span className="text-xs">{label}</span>
            </Link>
          ))}
        </div>

        {/* Primary Navigation Container */}
         <div className="relative h-16">
          <div className="absolute inset-0 bg-background/95 backdrop-blur-md rounded-full shadow-lg ring-1 ring-black/5 flex items-center justify-around">
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

            <div className="w-20 flex-shrink-0" />

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
                  <MoreHorizontal className={cn("h-5 w-5 transition-transform", isExpanded && "rotate-180")} />
                  <span>More</span>
              </button>
            </div>
          </div>
          
           <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] h-16 w-16 flex items-center justify-center z-10">
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
                        <ArrowRightLeft className="h-6 w-6" />
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
