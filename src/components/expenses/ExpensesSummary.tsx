'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Account, EnrichedExpense } from "@/lib/types";
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
            return { totalIncome: 0, totalExpense: 0, netBalance: 0 };
        }

        let netBalance = 0;
        let totalIncome = 0;
        let totalExpense = 0;

        accounts.forEach(account => {
            if (account.status !== 'active') return;

            if (account.type === 'credit_card') {
                // For credit cards, the balance is what you owe (an expense/liability)
                netBalance -= account.balance;
                totalExpense += account.balance;
            } else {
                // For other accounts, the balance is what you have
                netBalance += account.balance;
                if (account.balance > 0) {
                    totalIncome += account.balance;
                } else {
                    // This case is unlikely for non-credit card accounts but handles it.
                    totalExpense -= account.balance;
                }
            }
        });

        const totalAssets = accounts
            .filter(acc => acc.status === 'active' && acc.type !== 'credit_card')
            .reduce((sum, acc) => sum + acc.balance, 0);

        const totalLiabilities = accounts
            .filter(acc => acc.status === 'active' && acc.type === 'credit_card')
            .reduce((sum, acc) => sum + acc.balance, 0);
        
        const finalNetBalance = totalAssets - totalLiabilities;


        return {
            totalIncome: totalAssets,
            totalExpense: totalLiabilities,
            netBalance: finalNetBalance
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
                           <span className="text-muted-foreground">Assets:</span> {currencySymbol}{summary.totalIncome.toFixed(2)}
                        </p>
                         <p className="text-red-500">
                           <span className="text-muted-foreground">Liabilities:</span> {currencySymbol}{summary.totalExpense.toFixed(2)}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
