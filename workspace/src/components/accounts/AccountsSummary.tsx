'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Account } from "@/lib/types";
import { useMemo } from "react";
import { getCurrencySymbol } from "@/lib/currencies";
import { formatAmount } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AccountsSummaryProps {
    accounts: Account[];
    isLoading: boolean;
    currency?: string;
}

export function AccountsSummary({ accounts, isLoading, currency }: AccountsSummaryProps) {
    const currencySymbol = getCurrencySymbol(currency);

    const stats = useMemo(() => {
        const activeAccounts = accounts.filter(a => a.status === 'active' || a.status === undefined);
        
        const totalBalance = activeAccounts
            .filter(a => a.type !== 'credit_card')
            .reduce((sum, a) => sum + a.balance, 0);
            
        const creditCards = activeAccounts.filter(a => a.type === 'credit_card');
        const totalLimit = creditCards.reduce((sum, a) => sum + (a.limit || 0), 0);
        const totalAvailable = creditCards.reduce((sum, a) => sum + a.balance, 0);
        const totalUsed = Math.max(0, totalLimit - totalAvailable);
        
        const utilization = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

        return {
            totalBalance,
            totalLimit,
            totalUsed,
            totalAvailable,
            utilization
        };
    }, [accounts]);

    if (isLoading) {
        return <Skeleton className="h-44 w-full rounded-[28px]" />;
    }

    return (
        <Card className="rounded-[28px] border border-black/5 dark:border-white/5 shadow-[0_8px_24px_rgba(0,0,0,0.08),0_-8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)] bg-card overflow-hidden -translate-y-0.5 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12),0_-12px_32px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 relative z-10">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-8">
                    <div className="space-y-1">
                        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Total Balance</p>
                        <p className="text-2xl sm:text-4xl font-bold text-primary tracking-tight">
                            {currencySymbol}{formatAmount(stats.totalBalance)}
                        </p>
                    </div>
                    <div className="text-right space-y-1">
                        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Credit Limit</p>
                        <p className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">
                            {currencySymbol}{formatAmount(stats.totalLimit)}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <p className="text-sm font-medium text-foreground">Credit Used</p>
                        <p className="text-sm font-bold text-foreground">{stats.utilization.toFixed(1)}%</p>
                    </div>
                    
                    <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/30 transition-all duration-500"
                            style={{ width: `${Math.min(100, stats.utilization)}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <span>Used: {currencySymbol}{formatAmount(stats.totalUsed)}</span>
                        <span>Available: {currencySymbol}{formatAmount(stats.totalAvailable)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
