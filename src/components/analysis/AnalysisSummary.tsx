
'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EnrichedExpense } from "@/lib/types";
import { useMemo } from "react";
import { getCurrencySymbol } from "@/lib/currencies";
import { cn, formatAmount } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AnalysisSummaryProps {
    expenses: EnrichedExpense[];
    currency?: string;
    isLoading?: boolean;
    includeHidden: boolean;
    onIncludeHiddenChange: (value: boolean) => void;
}

export function AnalysisSummary({ isLoading, currency, expenses, includeHidden, onIncludeHiddenChange }: AnalysisSummaryProps) {
    const currencySymbol = getCurrencySymbol(currency);

    const stats = useMemo(() => {
        const totalIn = expenses.filter(exp => exp.type === 'income').reduce((sum, exp) => sum + exp.amount, 0);
        const totalOut = expenses.filter(exp => exp.type === 'expense').reduce((sum, exp) => sum + exp.amount, 0);
        const netFlow = totalIn - totalOut;
        return { totalIn, totalOut, netFlow };
    }, [expenses]);

    if (isLoading) {
        return <Skeleton className="h-44 w-full rounded-[24px]" />;
    }

    return (
        <Card className="rounded-[24px] border-none shadow-xl bg-card overflow-hidden">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Analysis Summary</p>
                        <p className={cn(
                            "text-2xl sm:text-4xl font-bold tracking-tight",
                            stats.netFlow >= 0 ? "text-primary" : "text-destructive"
                        )}>
                            {currencySymbol}{formatAmount(stats.netFlow)}
                        </p>
                    </div>
                    <div className="text-right space-y-2">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">In</p>
                            <p className="text-sm sm:text-lg font-bold text-green-600">{currencySymbol}{formatAmount(stats.totalIn)}</p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-destructive uppercase tracking-widest">Out</p>
                            <p className="text-sm sm:text-lg font-bold text-destructive">{currencySymbol}{formatAmount(stats.totalOut)}</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-muted/50 flex items-center justify-between">
                    <Label htmlFor="include-hidden" className="text-xs font-medium text-muted-foreground">Include Hidden Categories</Label>
                    <Switch 
                        id="include-hidden" 
                        checked={includeHidden} 
                        onCheckedChange={onIncludeHiddenChange}
                        className="scale-75 origin-right"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
