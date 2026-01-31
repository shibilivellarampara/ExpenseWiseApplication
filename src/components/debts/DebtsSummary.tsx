'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EnrichedDebt, UserProfile } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/currencies';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { cn, formatAmount } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface DebtsSummaryProps {
    debts: EnrichedDebt[];
    isLoading: boolean;
    onFilterChange: (type: 'lent' | 'borrowed') => void;
    activeFilter: 'all' | 'lent' | 'borrowed';
}

export function DebtsSummary({ debts, isLoading, onFilterChange, activeFilter }: DebtsSummaryProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    const { totalOwedToUser, totalUserOwes, netBalance } = useMemo(() => {
        const pendingDebts = debts.filter(d => d.status === 'pending');
        
        const totalOwedToUser = pendingDebts
            .filter(d => d.type === 'lent')
            .reduce((sum, d) => sum + d.amount, 0);
            
        const totalUserOwes = pendingDebts
            .filter(d => d.type === 'borrowed')
            .reduce((sum, d) => sum + d.amount, 0);

        const netBalance = totalOwedToUser - totalUserOwes;

        return { totalOwedToUser, totalUserOwes, netBalance };
    }, [debts]);

    if (isLoading) {
        return <Skeleton className="h-24" />;
    }

    return (
        <Card>
            <CardContent className="p-0 relative">
                 {activeFilter !== 'all' && (
                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-8 w-8 z-10" onClick={() => onFilterChange(activeFilter === 'lent' ? 'lent' : 'borrowed')}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Clear filter</span>
                    </Button>
                )}
                <div 
                    className="flex items-center justify-center"
                >
                    <div 
                        className={cn("flex-1 text-center p-4 cursor-pointer transition-colors rounded-l-lg", activeFilter === 'lent' ? 'bg-primary/10' : 'hover:bg-accent/50')}
                        onClick={() => onFilterChange('lent')}
                    >
                         <p className="text-sm text-muted-foreground">You are Owed</p>
                         <p className="text-2xl font-bold text-primary">{currencySymbol}{formatAmount(totalOwedToUser)}</p>
                    </div>
                    <Separator orientation="vertical" className="h-16" />
                     <div 
                        className={cn("flex-1 text-center p-4 cursor-pointer transition-colors rounded-r-lg", activeFilter === 'borrowed' ? 'bg-destructive/10' : 'hover:bg-accent/50')}
                        onClick={() => onFilterChange('borrowed')}
                     >
                         <p className="text-sm text-muted-foreground">You Owe</p>
                         <p className="text-2xl font-bold text-destructive">{currencySymbol}{formatAmount(totalUserOwes)}</p>
                    </div>
                </div>

                <div>
                    <Separator className="my-0" />
                    <div className="p-1 flex items-center justify-center gap-2">
                         <p className="text-sm text-muted-foreground">
                            {netBalance > 0 ? 'Net Owed:' : netBalance < 0 ? 'You Owe:' : 'Net Position:'}
                        </p>
                        <p className={cn("text-lg font-bold", netBalance >= 0 ? "text-primary" : "text-destructive")}>
                            {netBalance >= 0 ? `${currencySymbol}${formatAmount(netBalance)}` : `-${currencySymbol}${formatAmount(Math.abs(netBalance))}`}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
