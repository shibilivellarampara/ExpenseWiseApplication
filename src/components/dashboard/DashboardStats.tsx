'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EnrichedExpense } from "@/lib/types";
import { TrendingUp, Tag, TrendingDown, Minus, ArrowRightLeft } from "lucide-react";
import { useMemo } from "react";
import { getCurrencySymbol } from "@/lib/currencies";
import { formatAmount } from "@/lib/utils";

interface DashboardStatsProps {
    currentMonthExpenses: EnrichedExpense[];
    lastMonthExpenses: EnrichedExpense[];
    isLoading?: boolean;
    currency?: string;
}

export function DashboardStats({ currentMonthExpenses, lastMonthExpenses, isLoading, currency }: DashboardStatsProps) {

    const currencySymbol = getCurrencySymbol(currency);

    const stats = useMemo(() => {
        const currentMonthSpending = currentMonthExpenses.filter(e => e.type === 'expense');
        const lastMonthSpending = lastMonthExpenses.filter(e => e.type === 'expense');

        // Specifically only 'Transfer' category for current month
        const totalTransfersCurrent = currentMonthSpending
            .filter(e => e.category?.name === 'Transfer')
            .reduce((sum, e) => sum + e.amount, 0);

        // Specifically only 'Transfer' category for last month
        const totalTransfersLast = lastMonthSpending
            .filter(e => e.category?.name === 'Transfer')
            .reduce((sum, e) => sum + e.amount, 0);

        const totalCurrentAll = currentMonthSpending.reduce((sum, e) => sum + e.amount, 0);
        const totalLastAll = lastMonthSpending.reduce((sum, e) => sum + e.amount, 0);

        const adjustedTotalCurrent = totalCurrentAll - totalTransfersCurrent;
        const adjustedTotalLast = totalLastAll - totalTransfersLast;

        let momChange = 0;
        if (adjustedTotalLast > 0) {
            momChange = ((adjustedTotalCurrent - adjustedTotalLast) / adjustedTotalLast) * 100;
        } else if (adjustedTotalCurrent > 0) {
            momChange = 100; 
        }

        const categorySpending = new Map<string, number>();
        currentMonthSpending.forEach(e => {
            const categoryName = e.category?.name || 'Uncategorized';
            categorySpending.set(categoryName, (categorySpending.get(categoryName) || 0) + e.amount);
        });

        let topCategory = 'None';
        let topCategoryAmount = 0;
        if (categorySpending.size > 0) {
           const [name, amount] = [...categorySpending.entries()].reduce((a, b) => b[1] > a[1] ? b : a);
           topCategory = name;
           topCategoryAmount = amount;
        }

        return {
            totalExpense: adjustedTotalCurrent,
            totalTransfers: totalTransfersCurrent,
            topCategory: topCategory,
            topCategoryAmount: topCategoryAmount,
            monthOverMonthChange: momChange
        }
    }, [currentMonthExpenses, lastMonthExpenses]);

    if (isLoading) {
        return <DashboardStatsSkeleton />;
    }

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Monthly Expense</CardTitle>
                    <span className="text-muted-foreground font-bold">{currencySymbol}</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatAmount(stats.totalExpense)}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                        <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                            Excl. {currencySymbol}{formatAmount(stats.totalTransfers)} in transfers
                        </p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Top Spending Category</CardTitle>
                    <Tag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.topCategory}</div>
                    <p className="text-xs text-muted-foreground">{currencySymbol}{formatAmount(stats.topCategoryAmount)} spent this month</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Month-over-Month</CardTitle>
                     {stats.monthOverMonthChange > 0 ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                    ) : stats.monthOverMonthChange < 0 ? (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                    ) : (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                </CardHeader>
                <CardContent>
                     <div className={`text-2xl font-bold ${stats.monthOverMonthChange > 0 ? 'text-red-500' : stats.monthOverMonthChange < 0 ? 'text-green-500' : ''}`}>
                        {stats.monthOverMonthChange > 0 ? '+' : ''}{formatAmount(stats.monthOverMonthChange)}%
                    </div>
                    <p className="text-xs text-muted-foreground">vs. last month</p>
                </CardContent>
            </Card>
        </div>
    );
}

function DashboardStatsSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-7 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-7 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-7 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                </CardContent>
            </Card>
        </div>
    )
}
