'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EnrichedExpense, UserProfile } from "@/lib/types";
import { useMemo } from "react";
import { getCurrencySymbol } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";

interface AnalysisSummaryProps {
    allExpenses: EnrichedExpense[];
    analysisExpenses: EnrichedExpense[];
    currency?: string;
    isLoading?: boolean;
    showNormal: boolean;
    showAdjusted: boolean;
}

const calculateSummary = (expenses: EnrichedExpense[]) => {
    if (!expenses) {
        return { totalIn: 0, totalOut: 0, netFlow: 0 };
    }
    const totalIn = expenses.filter(exp => exp.type === 'income').reduce((sum, exp) => sum + exp.amount, 0);
    const totalOut = expenses.filter(exp => exp.type === 'expense').reduce((sum, exp) => sum + exp.amount, 0);
    const netFlow = totalIn - totalOut;
    return { totalIn, totalOut, netFlow };
};

export function AnalysisSummary({ isLoading, currency, allExpenses, analysisExpenses, showNormal, showAdjusted }: AnalysisSummaryProps) {
    const currencySymbol = getCurrencySymbol(currency);

    const normalSummary = useMemo(() => calculateSummary(allExpenses), [allExpenses]);
    const adjustedSummary = useMemo(() => calculateSummary(analysisExpenses), [analysisExpenses]);

    const isDifferent = JSON.stringify(normalSummary) !== JSON.stringify(adjustedSummary);

    if (!showNormal && !showAdjusted) {
        return null;
    }

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
    
    const renderSummaryBlock = (title: string, summary: { totalIn: number; totalOut: number; netFlow: number }, isAdjusted: boolean) => (
        <div className="flex-1">
             <h3 className="font-semibold text-base mb-1">{title}</h3>
            {isAdjusted && <p className="text-xs text-muted-foreground mb-3">Excludes categories hidden from analysis.</p>}
             <div className="flex justify-between items-center text-sm">
                <div>
                    <p className="text-muted-foreground">Net Balance</p>
                    <p className={cn(
                        "text-lg font-bold",
                        summary.netFlow >= 0 ? "text-green-600" : "text-red-500"
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
        </div>
    )

    return (
        <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {showNormal && renderSummaryBlock('Normal Total', normalSummary, false)}
                    
                    {showNormal && showAdjusted && isDifferent && (
                         <Separator orientation="vertical" className="h-auto hidden md:block" />
                    )}

                    {showAdjusted && isDifferent && renderSummaryBlock('Adjusted for Analysis', adjustedSummary, true)}
                </div>
            </CardContent>
        </Card>
    );
}