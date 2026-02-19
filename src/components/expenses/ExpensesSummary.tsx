'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Account, EnrichedExpense } from "@/lib/types";
import { useMemo } from "react";
import { getCurrencySymbol } from "@/lib/currencies";
import { cn, formatAmount } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface ExpensesSummaryProps {
    expenses: EnrichedExpense[];
    currency?: string;
    isLoading?: boolean;
    selectedAccount?: Account;
}

export function ExpensesSummary({ isLoading, currency, expenses, selectedAccount }: ExpensesSummaryProps) {
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
    
    const creditCardSummary = useMemo(() => {
        if (selectedAccount?.type !== 'credit_card') return null;

        const outstanding = (selectedAccount.limit || 0) - selectedAccount.balance;
        return {
            outstanding: outstanding,
            limit: selectedAccount.limit,
        }
    }, [selectedAccount]);

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
    
    const renderNormalSummary = () => (
         <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Net Balance</p>
            <p className={cn(
                "text-lg font-bold",
                summary.netFlow >= 0 ? "text-primary" : "text-destructive"
            )}>
                {currencySymbol}{summary.netFlow.toFixed(2)}
            </p>
        </div>
    );
    
    const renderCreditCardSummary = () => {
        if (!creditCardSummary) return null;
        
        const outstanding = creditCardSummary.outstanding;
        const isPositive = outstanding > 0;
        const isNegative = outstanding < 0;

        return (
            <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Outstanding</p>
                <p className={cn(
                    "text-lg font-bold",
                    isPositive ? "text-destructive" : "text-primary"
                )}>
                    {isNegative ? '-' : ''}{currencySymbol}{Math.abs(outstanding).toFixed(2)}
                </p>
            </div>
        )
    };


    return (
        <Card className="bg-card/80 backdrop-blur-sm border-none shadow-sm rounded-2xl">
            <CardContent className="p-4">
                <div className="flex justify-between items-center text-sm">
                   {creditCardSummary ? renderCreditCardSummary() : renderNormalSummary()}
                    <div className="text-right">
                        <p className="text-primary font-bold">
                           <span className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider">IN:</span> {currencySymbol}{summary.totalIn.toFixed(2)}
                        </p>
                         <p className="text-destructive font-bold">
                           <span className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider">OUT:</span> {currencySymbol}{summary.totalOut.toFixed(2)}
                        </p>
                         {creditCardSummary?.limit && (
                            <p className="text-muted-foreground text-[10px] mt-1 uppercase font-bold tracking-widest">
                                Limit: {currencySymbol}{creditCardSummary.limit.toFixed(2)}
                            </p>
                         )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
