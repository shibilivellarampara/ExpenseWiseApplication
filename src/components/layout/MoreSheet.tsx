
'use client';

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import Link from 'next/link';
import { HandCoins, FileUp, Settings, Info, ChevronRight, UserCircle } from 'lucide-react';
import { useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

const secondaryNavItems = [
  { href: '/debts', icon: <HandCoins className="h-6 w-6 text-primary" />, label: 'Debts & Dues' },
  { href: '/data', icon: <FileUp className="h-6 w-6 text-primary" />, label: 'Import / Export' },
  { href: '/profile', icon: <Settings className="h-6 w-6 text-primary" />, label: 'All Settings' },
  { href: '/about', icon: <Info className="h-6 w-6 text-primary" />, label: 'About' },
];

export function MoreSheet({ children }: { children?: React.ReactNode }) {
    const { user } = useUser();

    return (
        <Drawer>
            {children && <DrawerTrigger asChild>{children}</DrawerTrigger>}
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle>More Options</DrawerTitle>
                </DrawerHeader>
                <div className="py-4 px-4 space-y-4">
                    <Link href="/profile">
                        <div className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
                                <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-grow">
                                <p className="font-semibold text-lg">{user?.displayName}</p>
                                <p className="text-sm text-muted-foreground">{user?.email}</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </Link>

                    <div className="space-y-2">
                        {secondaryNavItems.map(item => (
                            <Link href={item.href} key={item.href} passHref>
                                 <div className="flex items-center gap-4 rounded-lg border bg-card p-6 transition-colors hover:bg-accent">
                                    {item.icon}
                                    <span className="flex-grow font-semibold text-lg">{item.label}</span>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
