'use client';

import { UserMembership } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Wallet, Users, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface WalletListProps {
    memberships: UserMembership[];
    isLoading: boolean;
}

export function WalletList({ memberships, isLoading }: WalletListProps) {
    if (isLoading) {
        return (
            <div className="grid gap-4">
                {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-[20px]" />
                ))}
            </div>
        );
    }

    if (memberships.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-[24px] bg-card/50">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Wallet className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold">No Family Wallets</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
                    Create a new family wallet or join one using an invite code.
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {memberships.map((membership) => (
                <Link 
                    key={membership.walletId} 
                    href={`/family-wallet/${membership.walletId}`}
                    className="block group"
                >
                    <Card className="rounded-[20px] shadow-md border-none overflow-hidden transition-all duration-300 group-hover:shadow-lg group-active:scale-[0.98]">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform duration-300 group-hover:scale-110">
                                    <Users className="h-6 w-6" />
                                </div>
                                <div className="flex-grow min-w-0">
                                    <h4 className="font-bold text-base truncate group-hover:text-primary transition-colors">
                                        {membership.walletName}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                        <Calendar className="h-3 w-3" />
                                        <span>Joined {format(membership.joinedAt.toDate(), 'MMM d, yyyy')}</span>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
