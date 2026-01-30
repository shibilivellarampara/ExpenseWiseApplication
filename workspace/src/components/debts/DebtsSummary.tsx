
'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EnrichedDebt, UserProfile } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/currencies';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface DebtsSummaryProps {
    debts: EnrichedDebt[];
    isLoading: boolean;
}

export function DebtsSummary({ debts, isLoading }: DebtsSummaryProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);
    const [showNet, setShowNet] = useState(false);

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
            <CardContent className="p-4">
                <div 
                    className="flex items-center justify-center cursor-pointer"
                    onClick={() => setShowNet(prev => !prev)}
                >
                    <div className="flex-1 text-center border-r pr-4">
                         <p className="text-sm text-muted-foreground">You are Owed</p>
                         <p className="text-2xl font-bold text-primary">{currencySymbol}{totalOwedToUser.toFixed(2)}</p>
                    </div>
                     <div className="flex-1 text-center">
                         <p className="text-sm text-muted-foreground">You Owe</p>
                         <p className="text-2xl font-bold text-destructive">{currencySymbol}{totalUserOwes.toFixed(2)}</p>
                    </div>
                </div>

                <div className={cn(
                    "transition-all duration-300 ease-in-out grid",
                    showNet ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                )}>
                    <div className="overflow-hidden">
                        <Separator className="my-4" />
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Net Position</p>
                            <p className={cn("text-2xl font-bold", netBalance >= 0 ? "text-primary" : "text-destructive")}>
                                {netBalance >= 0 ? `${currencySymbol}${netBalance.toFixed(2)}` : `-${currencySymbol}${Math.abs(netBalance).toFixed(2)}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                    {netBalance > 0 ? "Overall, you are owed money." : netBalance < 0 ? "Overall, you owe money." : "Overall, you are settled."}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
