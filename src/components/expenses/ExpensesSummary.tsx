
'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EnrichedExpense } from "@/lib/types";
import { useMemo } from "react";
import { getCurrencySymbol } from "@/lib/currencies";

interface ExpensesSummaryProps {
    expenses: EnrichedExpense[];
    isLoading?: boolean;
    currency?: string;
}

export function ExpensesSummary({ expenses, isLoading, currency }: ExpensesSummaryProps) {

    const currencySymbol = getCurrencySymbol(currency);

    const summary = useMemo(() => {
        const totalIncome = expenses
            .filter(e => e.type === 'income')
            .reduce((sum, e) => sum + e.amount, 0);
        
        const totalExpense = expenses
            .filter(e => e.type === 'expense')
            .reduce((sum, e) => sum + e.amount, 0);

        const netBalance = totalIncome - totalExpense;

        return {
            totalIncome,
            totalExpense,
            netBalance
        };
    }, [expenses]);

    if (isLoading) {
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
        <Card>
            <CardContent className="p-4">
                <div className="flex justify-between items-center text-sm">
                    <div>
                        <p className="text-muted-foreground">Net Balance</p>
                        <p className="text-lg font-bold">
                            {currencySymbol}{summary.netBalance.toFixed(2)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-green-600">
                           <span className="text-muted-foreground">In:</span> {currencySymbol}{summary.totalIncome.toFixed(2)}
                        </p>
                         <p className="text-red-600">
                           <span className="text-muted-foreground">Out:</span> {currencySymbol}{summary.totalExpense.toFixed(2)}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
