'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Account, EnrichedExpense } from "@/lib/types";
import { useMemo } from "react";
import { getCurrencySymbol } from "@/lib/currencies";
import { cn, formatAmount } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface ExpensesSummaryProps {
    expenses: EnrichedExpense[];
    currency?: string;
    isLoading?: boolean;
    selectedAccount?: Account;
}

const featuredCardClass = "rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_-8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)] -translate-y-0.5 border-none overflow-hidden bg-card transition-all duration-300 relative z-10";

export function ExpensesSummary({ isLoading, currency, expenses, selectedAccount }: ExpensesSummaryProps) {
    const currencySymbol = getCurrencySymbol(currency);

    const summary = useMemo(() => {
        if (!expenses) {
            return { totalIn: 0, totalOut: 0, netFlow: 0, inPercent: 50 };
        }

        const totalIn = expenses
            .filter(exp => exp.type === 'income')
            .reduce((sum, exp) => sum + exp.amount, 0);
        
        const totalOut = expenses
            .filter(exp => exp.type === 'expense')
            .reduce((sum, exp) => sum + exp.amount, 0);

        const netFlow = totalIn - totalOut;
        const total = totalIn + totalOut;
        const inPercent = total > 0 ? (totalIn / total) * 100 : 50;

        return { totalIn, totalOut, netFlow, inPercent };
    }, [expenses]);
    
    const creditCardSummary = useMemo(() => {
        if (selectedAccount?.type !== 'credit_card') return null;

        const outstanding = (selectedAccount.limit || 0) - selectedAccount.balance;
        const utilization = selectedAccount.limit ? (outstanding / selectedAccount.limit) * 100 : 0;
        
        return {
            outstanding: outstanding,
            limit: selectedAccount.limit,
            utilization: utilization
        }
    }, [selectedAccount]);

    if (isLoading) {
        return <Skeleton className="h-32 w-full rounded-[20px]" />;
    }

    const renderNormalSummary = () => (
        <div className="flex justify-between items-center">
            <div className="space-y-0.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Net Balance</p>
                <p className={cn(
                    "text-2xl sm:text-3xl font-bold tracking-tight",
                    summary.netFlow >= 0 ? "text-primary" : "text-destructive"
                )}>
                    {currencySymbol}{formatAmount(summary.netFlow)}
                </p>
            </div>
            
            <div className="flex flex-col gap-1.5">
                <div className="relative group">
                    <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" />
                    <div className="relative flex items-center justify-end gap-2">
                        <div className="flex items-center gap-1 opacity-70">
                            <ArrowUpRight className="h-2.5 w-2.5 text-primary" />
                            <span className="text-[9px] font-bold text-primary uppercase tracking-widest">IN:</span>
                        </div>
                        <span className="text-sm font-bold text-primary leading-none tabular-nums">
                            {currencySymbol}{formatAmount(summary.totalIn)}
                        </span>
                    </div>
                </div>

                <div className="relative group">
                    <div className="absolute inset-0 bg-destructive/10 blur-xl rounded-full" />
                    <div className="relative flex items-center justify-end gap-2">
                        <div className="flex items-center gap-1 opacity-70">
                            <ArrowDownRight className="h-2.5 w-2.5 text-destructive" />
                            <span className="text-[9px] font-bold text-destructive uppercase tracking-widest">OUT:</span>
                        </div>
                        <span className="text-sm font-bold text-destructive leading-none tabular-nums">
                            {currencySymbol}{formatAmount(summary.totalOut)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
    
    const renderCreditCardSummary = () => {
        if (!creditCardSummary) return null;
        
        const outstanding = creditCardSummary.outstanding;
        const isPositive = outstanding > 0;

        return (
            <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Outstanding</p>
                    <p className={cn(
                        "text-2xl sm:text-3xl font-bold tracking-tight",
                        isPositive ? "text-destructive" : "text-primary"
                    )}>
                        {currencySymbol}{formatAmount(Math.abs(outstanding))}
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                        {creditCardSummary.utilization.toFixed(1)}% Used
                    </p>
                </div>
                
                <div className="flex flex-col gap-1.5">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" />
                        <div className="relative flex items-center justify-end gap-2">
                            <div className="flex items-center gap-1 opacity-70">
                                <ArrowUpRight className="h-2.5 w-2.5 text-primary" />
                                <span className="text-[9px] font-bold text-primary uppercase tracking-widest">IN:</span>
                            </div>
                            <span className="text-sm font-bold text-primary leading-none tabular-nums">
                                {currencySymbol}{formatAmount(summary.totalIn)}
                            </span>
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-0 bg-destructive/10 blur-xl rounded-full" />
                        <div className="relative flex items-center justify-end gap-2">
                            <div className="flex items-center gap-1 opacity-70">
                                <ArrowDownRight className="h-2.5 w-2.5 text-destructive" />
                                <span className="text-[9px] font-bold text-destructive uppercase tracking-widest">OUT:</span>
                            </div>
                            <span className="text-sm font-bold text-destructive leading-none tabular-nums">
                                {currencySymbol}{formatAmount(summary.totalOut)}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-end gap-1.5 opacity-50 border-t border-border/30 pt-1">
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">LIMIT:</span>
                        <span className="text-[11px] font-bold text-muted-foreground tabular-nums">{currencySymbol}{formatAmount(creditCardSummary.limit || 0)}</span>
                    </div>
                </div>
            </div>
        )
    };

    return (
        <Card className={featuredCardClass}>
            <CardContent className="p-6">
                {creditCardSummary ? renderCreditCardSummary() : renderNormalSummary()}
            </CardContent>
        </Card>
    );
}
