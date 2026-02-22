
'use client';

import { Card, CardContent } from "@/components/ui/card";
import { EnrichedFamilyTransaction } from "@/lib/types";
import { useMemo } from "react";
import { getCurrencySymbol } from "@/lib/currencies";
import { formatAmount, cn } from "@/lib/utils";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

interface WalletSummaryProps {
    transactions: EnrichedFamilyTransaction[];
}

export function WalletSummary({ transactions }: WalletSummaryProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    const stats = useMemo(() => {
        const totalIn = transactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        const totalOut = transactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);

        return {
            totalIn,
            totalOut,
            netBalance: totalIn - totalOut
        };
    }, [transactions]);

    return (
        <Card className="rounded-[28px] border border-black/5 dark:border-white/5 shadow-[0_8px_24px_rgba(0,0,0,0.08),0_-8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)] bg-card overflow-hidden relative z-10">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Wallet Balance</p>
                        <p className={cn(
                            "text-3xl font-bold tracking-tight",
                            stats.netBalance >= 0 ? "text-primary" : "text-destructive"
                        )}>
                            {currencySymbol}{formatAmount(stats.netBalance)}
                        </p>
                    </div>
                    <div className="text-right space-y-1 mt-1">
                        <div className="flex items-center justify-end gap-2">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">IN:</span>
                            <span className="text-sm font-bold text-primary">{currencySymbol}{formatAmount(stats.totalIn)}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <span className="text-[10px] font-bold text-destructive uppercase tracking-widest">OUT:</span>
                            <span className="text-sm font-bold text-destructive">{currencySymbol}{formatAmount(stats.totalOut)}</span>
                        </div>
                    </div>
                </div>

                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/30 transition-all duration-500"
                        style={{ width: '100%' }}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
