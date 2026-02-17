'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Account } from "@/lib/types";
import { useMemo } from "react";
import { getCurrencySymbol } from "@/lib/currencies";
import { formatAmount } from "@/lib/utils";

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
        return <Skeleton className="h-44 w-full rounded-3xl" />;
    }

    return (
        <Card className="rounded-[24px] border-none shadow-xl bg-card overflow-hidden">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-8">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Total Balance</p>
                        <p className="text-3xl font-bold text-primary">
                            {currencySymbol}{formatAmount(stats.totalBalance)}
                        </p>
                    </div>
                    <div className="text-right space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Credit Limit</p>
                        <p className="text-xl font-bold text-foreground">
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
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/30 to-primary transition-all duration-500"
                            style={{ width: `${Math.min(100, stats.utilization)}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>Used: {currencySymbol}{formatAmount(stats.totalUsed)}</span>
                        <span>Available: {currencySymbol}{formatAmount(stats.totalAvailable)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}