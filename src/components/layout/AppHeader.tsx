'use client';

import { UserNav } from '@/components/auth/UserNav';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuFooter } from '@/components/ui/dropdown-menu';
import { PanelLeft, Bell, Circle, CheckCheck, MoreHorizontal } from 'lucide-react';
import { Logo } from '../Logo';
import {
  LayoutDashboard,
  Wallet,
  FileUp,
  Settings,
  ArrowRightLeft,
  Info,
  BarChartHorizontal,
  HandCoins,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Account, UserProfile } from '@/lib/types';
import { collection, query, where, doc } from 'firebase/firestore';

const appVersion = "1.6.9";


const baseNavItems = [
  { href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
  { href: '/transactions', special_href: '/expenses', icon: <ArrowRightLeft className="h-5 w-5" />, label: 'Transactions' },
  { href: '/accounts', icon: <Wallet className="h-5 w-5" />, label: 'Accounts' },
  { href: '/analysis', icon: <BarChartHorizontal className="h-5 w-5" />, label: 'Analysis' },
  { href: '/debts', icon: <HandCoins className="h-5 w-5" />, label: 'Debts' },
  { href: '/data', icon: <FileUp className="h-5 w-5" />, label: 'Import / Export' },
  { href: '/profile', icon: <Settings className="h-5 w-5" />, label: 'Settings' },
  { href: '/about', icon: <Info className="h-5 w-5" />, label: 'About' },
];

const getPageTitle = (path: string): string => {
    if (path.startsWith('/admin/users')) return 'User Management';
    if (path.startsWith('/admin')) return 'Admin Dashboard';
    if (path.startsWith('/profile')) return 'Settings';
    
    const secondaryNavItems = [
      { href: '/debts', label: 'Debts & Dues' },
      { href: '/data', label: 'Import / Export' },
      { href: '/about', label: 'About' },
    ];
    
    const secondaryNavItem = secondaryNavItems.find(item => path.startsWith(item.href));
    if(secondaryNavItem) return secondaryNavItem.label;

    const navItem = baseNavItems.find(item => {
        if(item.label === 'Import / Export') {
            return path.startsWith('/data') || path.startsWith('/import') || path.startsWith('/reports');
        }
        return path.startsWith(item.href) || (item.special_href && path.startsWith(item.special_href))
    });
    return navItem ? navItem.label : 'Dashboard';
}

function Notifications() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();

    const accountsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/accounts`), where('type', '==', 'credit_card'));
    }, [user, firestore]);

    const { data: creditCards } = useCollection<Account>(accountsQuery);

    useEffect(() => {
        const generatedNotifications: any[] = [];
        const today = new Date();
        const currentDay = today.getDate();

        creditCards?.forEach(card => {
            const outstandingAmount = (card.limit || 0) - card.balance;

            if (card.billingDate && outstandingAmount > 0) {
                const daysUntilBilling = (card.billingDate - currentDay + 30) % 30; // simple days diff
                if (daysUntilBilling <= 5 && daysUntilBilling >= 0) {
                     generatedNotifications.push({
                        id: `cc-due-${card.id}`,
                        text: `Your payment for ${card.name} is due soon (Billing Date: ${card.billingDate}th).`,
                        read: false,
                        href: '/accounts'
                    });
                }
            }
        });
        
        setNotifications(generatedNotifications);
    }, [creditCards]);


    const unreadCount = notifications.filter(n => !n.read).length;

    const handleNotificationClick = (id: number | string, href: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        router.push(href);
    };

    const handleMarkAllAsRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setTimeout(() => {
            setNotifications([]);
        }, 500); // Hide after a short delay for animation
    };


    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Toggle notifications</span>
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-80">
                <DropdownMenuLabel className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span>Notifications</span>
                        {unreadCount > 0 && <Badge variant="secondary">{unreadCount} New</Badge>}
                    </div>
                    {unreadCount > 0 && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={handleMarkAllAsRead}
                                    >
                                        <CheckCheck className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Mark all as read</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? notifications.map(notification => (
                     <DropdownMenuItem key={notification.id} onSelect={() => handleNotificationClick(notification.id, notification.href)} className="flex items-center gap-3 cursor-pointer">
                        {!notification.read && <Circle className="text-primary h-2.5 w-2.5 fill-current" />}
                        <span className={cn("flex-1 whitespace-normal", notification.read && "pl-5 text-muted-foreground")}>
                            {notification.text}
                        </span>
                    </DropdownMenuItem>
                )) : (
                    <div className="text-center text-sm text-muted-foreground p-4">No new notifications.</div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export function AppHeader() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
    
  const pageTitle = getPageTitle(pathname);
    
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 md:px-6 sticky top-0 z-30">
        
         <div className="md:hidden">
            <Logo />
        </div>
        <div className="hidden md:block flex-1">
             <h1 className="text-lg font-semibold">{pageTitle}</h1>
        </div>
        
        <div className="flex-1 md:hidden" />
        
        <div className="flex items-center gap-2">
            {isUserLoading ? (
                <Skeleton className="h-10 w-10 rounded-full" />
            ) : (
                <>
                    <Notifications />
                    <ThemeToggle />
                    <UserNav />
                </>
            )}
        </div>
    </header>
  );
}
