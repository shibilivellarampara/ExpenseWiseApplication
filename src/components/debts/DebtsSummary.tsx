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
import { Button } from '../ui/button';
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

    const handleSectionClick = (type: 'lent' | 'borrowed') => {
        onFilterChange(type);
        setShowNet(true);
    };

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
                        onClick={() => handleSectionClick('lent')}
                    >
                         <p className="text-sm text-muted-foreground">You are Owed</p>
                         <p className="text-2xl font-bold text-primary">{currencySymbol}{totalOwedToUser.toFixed(2)}</p>
                    </div>
                    <Separator orientation="vertical" className="h-16" />
                     <div 
                        className={cn("flex-1 text-center p-4 cursor-pointer transition-colors rounded-r-lg", activeFilter === 'borrowed' ? 'bg-destructive/10' : 'hover:bg-accent/50')}
                        onClick={() => handleSectionClick('borrowed')}
                     >
                         <p className="text-sm text-muted-foreground">You Owe</p>
                         <p className="text-2xl font-bold text-destructive">{currencySymbol}{totalUserOwes.toFixed(2)}</p>
                    </div>
                </div>

                <div className={cn(
                    "transition-all duration-300 ease-in-out grid cursor-pointer",
                    showNet ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                )} onClick={() => setShowNet(false)}>
                    <div className="overflow-hidden">
                        <Separator className="my-0" />
                        <div className="text-center p-4">
                            <p className="text-sm text-muted-foreground">Net Position</p>
                             <p className={cn("text-xl font-bold", netBalance >= 0 ? "text-primary" : "text-destructive")}>
                                {netBalance >= 0 ? `${currencySymbol}${netBalance.toFixed(2)}` : `-${currencySymbol}${Math.abs(netBalance).toFixed(2)}`}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
