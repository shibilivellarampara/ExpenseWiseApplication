
'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EnrichedExpense } from "@/lib/types";
import { useMemo } from "react";
import { getCurrencySymbol } from "@/lib/currencies";
import { cn } from "@/lib/utils";

interface ExpensesSummaryProps {
    expenses: EnrichedExpense[];
    currency?: string;
    isLoading?: boolean;
}

export function ExpensesSummary({ isLoading, currency, expenses }: ExpensesSummaryProps) {
    const currencySymbol = getCurrencySymbol(currency);

    const summary = useMemo(() => {
        if (!expenses) {
            return { totalIn: 0, totalOut: 0, netFlow: 0 };
        }

        const totalIn = expenses
            .filter(exp => exp.type === 'income')
            .reduce((sum, exp) => sum + exp.amount, 0);
        
        const totalOut = expenses
            .filter(exp => exp.type === 'expense')
            .reduce((sum, exp) => sum + exp.amount, 0);

        const netFlow = totalIn - totalOut;

        return { totalIn, totalOut, netFlow };
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
        <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
                <div className="flex justify-between items-center text-sm">
                    <div>
                        <p className="text-muted-foreground">Net Flow (In - Out)</p>
                        <p className={cn(
                            "text-lg font-bold",
                            summary.netFlow >= 0 && "text-green-600",
                            summary.netFlow < 0 && "text-red-500"
                        )}>
                            {currencySymbol}{summary.netFlow.toFixed(2)}
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
