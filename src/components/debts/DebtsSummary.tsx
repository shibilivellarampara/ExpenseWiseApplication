'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EnrichedDebt, UserProfile } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/currencies';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ArrowDown, ArrowUp } from 'lucide-react';

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

    const { totalOwedToUser, totalUserOwes } = useMemo(() => {
        const pendingDebts = debts.filter(d => d.status === 'pending');
        
        const totalOwedToUser = pendingDebts
            .filter(d => d.type === 'lent')
            .reduce((sum, d) => sum + d.amount, 0);
            
        const totalUserOwes = pendingDebts
            .filter(d => d.type === 'borrowed')
            .reduce((sum, d) => sum + d.amount, 0);

        return { totalOwedToUser, totalUserOwes };
    }, [debts]);

    if (isLoading) {
        return (
             <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">You are Owed</CardTitle>
                    <ArrowDown className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                        {currencySymbol}{totalOwedToUser.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">Total money lent to others that is pending.</p>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">You Owe</CardTitle>
                    <ArrowUp className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                     <div className="text-2xl font-bold text-destructive">
                        {currencySymbol}{totalUserOwes.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">Total money borrowed from others that is pending.</p>
                </CardContent>
            </Card>
        </div>
    );
}
