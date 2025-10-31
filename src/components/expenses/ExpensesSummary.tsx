'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Account } from "@/lib/types";
import { useMemo } from "react";
import { getCurrencySymbol } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";

interface ExpensesSummaryProps {
    currency?: string;
    isLoading?: boolean;
}

export function ExpensesSummary({ isLoading, currency }: ExpensesSummaryProps) {
    const { user } = useUser();
    const firestore = useFirestore();

    const accountsQuery = useMemoFirebase(() => 
        user ? collection(firestore, `users/${user.uid}/accounts`) : null
    , [firestore, user]);
    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);

    const currencySymbol = getCurrencySymbol(currency);

    const summary = useMemo(() => {
        if (!accounts) {
            return { totalIn: 0, totalOut: 0, netBalance: 0 };
        }

        const totalAssets = accounts
            .filter(acc => acc.status === 'active' && acc.type !== 'credit_card')
            .reduce((sum, acc) => sum + acc.balance, 0);

        const totalLiabilities = accounts
            .filter(acc => acc.status === 'active' && acc.type === 'credit_card')
            .reduce((sum, acc) => sum + acc.balance, 0);
        
        const netBalance = totalAssets - totalLiabilities;

        return {
            totalIn: totalAssets,
            totalOut: totalLiabilities,
            netBalance: netBalance
        };
    }, [accounts]);

    if (isLoading || accountsLoading) {
        return (
            <Card>
                <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                        <div>
                             <Skeleton className="h-4 w-20 mb-2" />
                             <Skeleton className="h-6 w-28" />
                        </div>
                        <div className="text-right">
                             <Skeleton className="h-4 w-24 mb-2" />
                             <Skeleton className="h-4 w-20" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
                <div className="flex justify-between items-center text-sm">
                    <div>
                        <p className="text-muted-foreground">Net Balance</p>
                        <p className={cn(
                            "text-lg font-bold",
                            summary.netBalance >= 0 && "text-green-600",
                            summary.netBalance < 0 && "text-red-500"
                        )}>
                            {currencySymbol}{summary.netBalance.toFixed(2)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-green-600">
                           <span className="text-muted-foreground">IN:</span> {currencySymbol}{summary.totalIn.toFixed(2)}
                        </p>
                         <p className="text-red-500">
                           <span className="text-muted-foreground">OUT:</span> {currencySymbol}{summary.totalOut.toFixed(2)}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
