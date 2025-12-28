
'use client';

import {
  Drawer,
  DrawerClose,
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
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

const secondaryNavItems = [
  { href: '/debts', icon: <HandCoins className="h-5 w-5 text-muted-foreground" />, label: 'Debts & Dues' },
  { href: '/data', icon: <FileUp className="h-5 w-5 text-muted-foreground" />, label: 'Import / Export' },
  { href: '/profile', icon: <Settings className="h-5 w-5 text-muted-foreground" />, label: 'All Settings' },
  { href: '/about', icon: <Info className="h-5 w-5 text-muted-foreground" />, label: 'About' },
];

export function MoreSheet({ children }: { children?: React.ReactNode }) {
    const { user } = useUser();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
            {children && <DrawerTrigger asChild>{children}</DrawerTrigger>}
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle>More Options</DrawerTitle>
                </DrawerHeader>
                <div className="py-2 px-2">
                    <nav className="space-y-1">
                        {secondaryNavItems.map(item => (
                             <DrawerClose key={item.href} asChild>
                                <Link href={item.href} passHref>
                                     <div className="flex items-center gap-4 rounded-md p-3 transition-colors hover:bg-accent text-foreground">
                                        {item.icon}
                                        <span className="flex-grow font-medium">{item.label}</span>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                </Link>
                            </DrawerClose>
                        ))}
                    </nav>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
