
'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import Link from "next/link";
import { HandCoins, FileUp, Settings, Info, ChevronRight, UserCircle } from "lucide-react";
import { useUser } from "@/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

const secondaryNavItems = [
  { href: '/debts', icon: <HandCoins className="h-6 w-6 text-primary" />, label: 'Debts & Dues' },
  { href: '/data', icon: <FileUp className="h-6 w-6 text-primary" />, label: 'Import / Export' },
  { href: '/profile', icon: <Settings className="h-6 w-6 text-primary" />, label: 'All Settings' },
  { href: '/about', icon: <Info className="h-6 w-6 text-primary" />, label: 'About' },
];

export function MoreOptionsDrawer({ children }: { children: React.ReactNode }) {
    const { user } = useUser();

    return (
        <Drawer>
            <DrawerTrigger asChild>{children}</DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>More Options</DrawerTitle>
                </DrawerHeader>
                <div className="p-4 pt-0">
                    <div className="space-y-4">
                        <Link href="/profile">
                            <div className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent">
                                <Avatar className="h-14 w-14">
                                    <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
                                    <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-grow">
                                    <p className="font-semibold text-base">{user?.displayName}</p>
                                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </Link>

                        <div className="grid grid-cols-1 gap-2">
                            {secondaryNavItems.map(item => (
                                <Link href={item.href} key={item.href} passHref>
                                    <div className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent">
                                        {item.icon}
                                        <span className="flex-grow font-medium">{item.label}</span>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
