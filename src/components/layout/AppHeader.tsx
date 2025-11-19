
'use client';

import { UserNav } from '@/components/auth/UserNav';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useSidebar } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuFooter } from '@/components/ui/dropdown-menu';
import { PanelLeft, Bell, Circle, CheckCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { NavLink } from './AppSidebar';
import {
  LayoutDashboard,
  Wallet,
  FileUp,
  Settings,
  ArrowRightLeft,
  Briefcase,
  FileText,
  Info,
  BarChartHorizontal,
} from 'lucide-react';
import pkg from '../../../package.json';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '../ThemeToggle';
import { Badge } from '@/components/ui/badge';
import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';


const appVersion = pkg.version;


const navItems = [
  { href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
  { href: '/expenses', icon: <ArrowRightLeft className="h-5 w-5" />, label: 'Transactions' },
  { href: '/analysis', icon: <BarChartHorizontal className="h-5 w-5" />, label: 'Analysis' },
  { href: '/accounts', icon: <Wallet className="h-5 w-5" />, label: 'Accounts' },
  { href: '/reports', icon: <FileText className="h-5 w-5" />, label: 'Reports' },
  { href: '/shared-expenses', icon: <Briefcase className="h-5 w-5" />, label: 'Shared Expenses' },
  { href: '/import', icon: <FileUp className="h-5 w-5" />, label: 'Import' },
  { href: '/profile', icon: <Settings className="h-5 w-5" />, label: 'Settings' },
  { href: '/about', icon: <Info className="h-5 w-5" />, label: 'About' },
];

const initialNotifications = [
    { id: 1, text: 'Your monthly report for October is ready for download.', read: false, href: '/reports' },
    { id: 2, text: 'A new shared expense for "Goa Trip" was added by John Doe.', read: false, href: '/shared-expenses' },
    { id: 3, text: 'Your HDFC Credit Card payment of ₹5,400 is due tomorrow.', read: false, href: '/accounts' },
];


function getPageTitle(path: string): string {
    if (path.startsWith('/admin/users')) return 'User Management';
    if (path.startsWith('/admin')) return 'Admin Dashboard';
    if (path.startsWith('/profile')) return 'Settings';
    const title = path.split('/').pop()?.replace(/-/g, ' ');
    if (path.includes('/shared-expenses/') && path.split('/').length > 2) {
        return "Shared Space";
    }
    return title ? title.charAt(0).toUpperCase() + title.slice(1) : 'Dashboard';
}

function Notifications() {
    const [notifications, setNotifications] = useState(initialNotifications);
    const router = useRouter();

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleNotificationClick = (id: number, href: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        router.push(href);
    };

    const handleMarkAllAsRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };


    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
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
                {notifications.map(notification => (
                     <DropdownMenuItem key={notification.id} onSelect={() => handleNotificationClick(notification.id, notification.href)} className="flex items-start gap-3 cursor-pointer">
                        {!notification.read && <Circle className="text-primary h-2.5 w-2.5 fill-current mt-1.5" />}
                        <span className={cn("flex-1 whitespace-normal", notification.read && "pl-5 text-muted-foreground")}>
                            {notification.text}
                        </span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export function AppHeader() {
  const pathname = usePathname();
  const { isUserLoading } = useUser();
  const { openMobile, setOpenMobile } = useSidebar();
    
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 md:px-6 sticky top-0 z-30">
        
         <div className="md:hidden">
             <Sheet open={openMobile} onOpenChange={setOpenMobile}>
                <SheetTrigger asChild>
                    <Button size="icon" variant="ghost">
                        <PanelLeft />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64">
                    <div className="flex h-full flex-col bg-sidebar-background text-sidebar-foreground">
                        <SheetHeader className="p-4 border-b border-sidebar-border">
                          <SheetTitle>
                            <Logo />
                          </SheetTitle>
                        </SheetHeader>
                        <nav className="flex-grow space-y-2 mt-4 px-2">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.href}
                                    href={item.href}
                                    icon={item.icon}
                                    label={item.label}
                                    isActive={pathname.startsWith(item.href)}
                                />
                            ))}
                        </nav>
                        <div className="mt-auto p-4 text-center text-xs text-sidebar-muted-foreground">
                            <Separator className='my-2 bg-sidebar-border' />
                            <span>Version {appVersion}</span>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>

        <div className="flex-1">
            {/* The main title is removed to have a cleaner header for transactions page */}
        </div>
        
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
