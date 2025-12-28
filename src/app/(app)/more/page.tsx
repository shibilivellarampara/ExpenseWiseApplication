
'use client';
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { HandCoins, FileUp, Settings, Info, ChevronRight, UserCircle } from "lucide-react";
import { UserNav } from "@/components/auth/UserNav";
import { useUser } from "@/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

const secondaryNavItems = [
  { href: '/debts', icon: <HandCoins className="h-6 w-6 text-primary" />, label: 'Debts & Dues' },
  { href: '/data', icon: <FileUp className="h-6 w-6 text-primary" />, label: 'Import / Export' },
  { href: '/profile', icon: <Settings className="h-6 w-6 text-primary" />, label: 'All Settings' },
  { href: '/about', icon: <Info className="h-6 w-6 text-primary" />, label: 'About' },
];

export default function MorePage() {
    const { user } = useUser();
    return (
        <div className="w-full space-y-8">
            <PageHeader title="More" />

            <div className="space-y-4">
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


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
    );
}
