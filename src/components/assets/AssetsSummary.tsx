'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn, formatAmount } from "@/lib/utils";
import { getCurrencySymbol } from "@/lib/currencies";

interface AssetsSummaryProps {
    totalNetAssets: number;
    totalInvested: number;
    overallGainLoss: number;
    overallReturn: number;
    isLoading: boolean;
    currency?: string;
}

const featuredCardClass = "rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_-8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)] -translate-y-0.5 border-none overflow-hidden bg-card transition-all duration-300 relative z-10";

export function AssetsSummary({ totalNetAssets, totalInvested, overallGainLoss, overallReturn, isLoading, currency }: AssetsSummaryProps) {
    const currencySymbol = getCurrencySymbol(currency);

    if (isLoading) {
        return <Skeleton className="h-44 w-full rounded-[24px]" />;
    }

    return (
        <Card className={featuredCardClass}>
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-8">
                    <div className="space-y-1">
                        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Net Assets</p>
                        <p className="text-2xl sm:text-4xl font-bold text-primary tracking-tight">
                            {currencySymbol}{formatAmount(totalNetAssets)}
                        </p>
                    </div>
                    <div className="text-right space-y-1">
                        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Total Invested</p>
                        <p className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">
                            {currencySymbol}{formatAmount(totalInvested)}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <p className="text-sm font-medium text-foreground">Performance</p>
                        <div className={cn(
                            "flex items-center gap-1.5 font-bold",
                            overallGainLoss >= 0 ? "text-primary" : "text-destructive"
                        )}>
                            {overallGainLoss >= 0 ? <TrendingUp className="h-4 w-4"/> : <TrendingDown className="h-4 w-4"/>}
                            <span>{overallReturn.toFixed(2)}%</span>
                        </div>
                    </div>
                    
                    <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                            className={cn(
                                "absolute inset-y-0 left-0 transition-all duration-500",
                                overallGainLoss >= 0 ? "bg-gradient-to-r from-primary to-primary/30" : "bg-gradient-to-r from-destructive to-destructive/30"
                            )}
                            style={{ width: `100%` }}
                        />
                    </div>

                    <div className="flex justify-between text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <span>{overallGainLoss >= 0 ? 'Profit' : 'Loss'}: {currencySymbol}{formatAmount(Math.abs(overallGainLoss))}</span>
                        <span className="uppercase tracking-tighter opacity-70">Holdings Snapshot</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}