'use client';

import { UserNav } from '@/components/auth/UserNav';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Bell, Circle, RefreshCw } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Account } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';

const getPageTitle = (path: string): string => {
    if (path.startsWith('/admin/users')) return 'User Management';
    if (path.startsWith('/admin')) return 'Admin Dashboard';
    if (path.startsWith('/profile')) return 'Settings';
    
    const navItems = [
      { href: '/debts', label: 'Debts & Dues' },
      { href: '/data', label: 'Import / Export' },
      { href: '/about', label: 'About' },
      { href: '/analysis', label: 'Analysis' },
      { href: '/accounts', label: 'Accounts' },
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/transactions', label: 'Transactions' },
      { href: '/expenses', label: 'Transactions' },
      { href: '/recurring', label: 'Recurring' },
      { href: '/assets', label: 'Assets' },
    ];
    
    const item = navItems.find(item => path.startsWith(item.href));
    return item ? item.label : 'Dashboard';
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
            const outstandingAmount = Math.round(((card.limit || 0) - card.balance) * 100) / 100;

            if (card.billingDate && outstandingAmount > 0) {
                const daysUntilBilling = (card.billingDate - currentDay + 30) % 30;
                if (daysUntilBilling <= 5 && daysUntilBilling >= 0) {
                     generatedNotifications.push({
                        id: `cc-due-${card.id}`,
                        text: `Payment for ${card.name} is due soon.`,
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

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-muted focus-visible:ring-0 focus-visible:ring-offset-0 opacity-70 hover:opacity-100 transition-opacity">
                    <Bell className="h-[1.1rem] w-[1.1rem] text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 rounded-[20px] shadow-2xl border-none p-2">
                <DropdownMenuLabel className="flex justify-between items-center px-3 py-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Notifications</span>
                    {unreadCount > 0 && <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold rounded-full">{unreadCount}</Badge>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-muted/50" />
                {notifications.length > 0 ? notifications.map(notification => (
                     <DropdownMenuItem key={notification.id} onSelect={() => handleNotificationClick(notification.id, notification.href)} className="flex items-center gap-3 cursor-pointer rounded-xl p-3">
                        {!notification.read && <Circle className="text-primary h-2 w-2 fill-current" />}
                        <span className={cn("flex-1 text-[13px] font-medium leading-snug", notification.read && "pl-5 text-muted-foreground")}>
                            {notification.text}
                        </span>
                    </DropdownMenuItem>
                )) : (
                    <div className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40 py-8">All Caught Up</div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function DevReloadButton() {
    if (process.env.NODE_ENV !== 'development') return null;
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0 opacity-70 hover:opacity-100 transition-opacity" onClick={() => window.location.reload()}>
                        <RefreshCw className="h-[1.1rem] w-[1.1rem] text-muted-foreground" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Reload Page</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

export function AppHeader() {
  const pathname = usePathname();
  const { isUserLoading } = useUser();
  const pageTitle = getPageTitle(pathname);
    
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border/10 bg-background/95 backdrop-blur-md px-4 md:px-6 pt-[env(safe-area-inset-top)] animate-in fade-in duration-500">
        <div className="flex-1 flex items-center gap-2.5">
             <Link href="/dashboard" className="flex items-center">
                <Image 
                    src="/logo.png" 
                    alt="Logo" 
                    width={24} 
                    height={24} 
                    className="h-6 w-6 object-contain" 
                />
             </Link>
             <h1 className="text-lg font-bold tracking-tight text-foreground">{pageTitle}</h1>
        </div>
        
        <div className="flex items-center gap-1.5">
            {isUserLoading ? (
                <Skeleton className="h-8 w-8 rounded-full" />
            ) : (
                <>
                    <DevReloadButton />
                    <Notifications />
                    <ThemeToggle />
                    <UserNav />
                </>
            )}
        </div>
    </header>
  );
}