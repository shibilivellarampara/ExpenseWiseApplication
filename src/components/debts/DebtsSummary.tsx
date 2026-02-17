'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EnrichedDebt, UserProfile } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/currencies';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
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
        
        const personBalances = new Map<string, number>();

        pendingDebts.forEach(debt => {
            const currentBalance = personBalances.get(debt.personName) || 0;
            const amountChange = debt.type === 'lent' ? debt.amount : -debt.amount;
            personBalances.set(debt.personName, currentBalance + amountChange);
        });

        let totalOwedToUser = 0;
        let totalUserOwes = 0;

        for (const balance of personBalances.values()) {
            if (balance > 0) {
                totalOwedToUser += balance;
            } else if (balance < 0) {
                totalUserOwes += Math.abs(balance);
            }
        }
        
        const netBalance = totalOwedToUser - totalUserOwes;

        return { totalOwedToUser, totalUserOwes, netBalance };
    }, [debts]);

    if (isLoading) {
        return <Skeleton className="h-44 w-full rounded-[24px]" />;
    }

    return (
        <Card className="rounded-[24px] border-none shadow-xl bg-card overflow-hidden relative">
            {activeFilter !== 'all' && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8 z-10 hover:bg-primary/10 rounded-full" 
                    onClick={() => onFilterChange(activeFilter === 'lent' ? 'lent' : 'borrowed')}
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Clear filter</span>
                </Button>
            )}
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-8">
                    <div 
                        className={cn(
                            "space-y-1 cursor-pointer transition-all p-2 rounded-xl -m-2",
                            activeFilter === 'lent' ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/50"
                        )}
                        onClick={() => onFilterChange('lent')}
                    >
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Owed to You</p>
                        <p className="text-3xl font-bold text-primary">
                            {currencySymbol}{formatAmount(totalOwedToUser)}
                        </p>
                    </div>
                    <div 
                        className={cn(
                            "text-right space-y-1 cursor-pointer transition-all p-2 rounded-xl -m-2",
                            activeFilter === 'borrowed' ? "bg-destructive/5 ring-1 ring-destructive/20" : "hover:bg-muted/50"
                        )}
                        onClick={() => onFilterChange('borrowed')}
                    >
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">You Owe</p>
                        <p className="text-3xl font-bold text-destructive">
                            {currencySymbol}{formatAmount(totalUserOwes)}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <p className="text-sm font-medium text-foreground">
                            {netBalance >= 0 ? 'Net Receivable' : 'Net Payable'}
                        </p>
                        <p className={cn(
                            "text-lg font-bold",
                            netBalance >= 0 ? "text-primary" : "text-destructive"
                        )}>
                            {currencySymbol}{formatAmount(Math.abs(netBalance))}
                        </p>
                    </div>
                    
                    <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                            className={cn(
                                "absolute inset-y-0 left-0 transition-all duration-500",
                                netBalance >= 0 ? "bg-gradient-to-r from-primary/30 to-primary" : "bg-gradient-to-r from-destructive/30 to-destructive"
                            )}
                            style={{ width: `100%` }}
                        />
                    </div>

                    <p className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest text-center">
                        Financial Position at a glance
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
