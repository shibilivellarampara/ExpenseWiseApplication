
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EnrichedExpense } from "@/lib/types";
import { TrendingUp, Tag, TrendingDown, Minus } from "lucide-react";
import { useMemo } from "react";
import { getCurrencySymbol } from "@/lib/currencies";

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

        const totalCurrent = currentMonthSpending.reduce((sum, e) => sum + e.amount, 0);
        const totalLast = lastMonthSpending.reduce((sum, e) => sum + e.amount, 0);

        let momChange = 0;
        if (totalLast > 0) {
            momChange = ((totalCurrent - totalLast) / totalLast) * 100;
        } else if (totalCurrent > 0) {
            momChange = 100; // Infinite increase if last month was 0
        }

        const categorySpending = new Map<string, number>();
        currentMonthSpending.forEach(e => {
            const categoryName = e.category?.name || 'Uncategorized';
            categorySpending.set(categoryName, (categorySpending.get(categoryName) || 0) + e.amount);
        });

        let topCategory = 'None';
        if (categorySpending.size > 0) {
           topCategory = [...categorySpending.entries()].reduce((a, b) => b[1] > a[1] ? b : a)[0];
        }

        return {
            totalExpense: totalCurrent,
            topCategory: topCategory,
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
                    <div className="text-2xl font-bold">{currencySymbol}{stats.totalExpense.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Cash out this month</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Top Spending Category</CardTitle>
                    <Tag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.topCategory}</div>
                    <p className="text-xs text-muted-foreground">Most spent category this month</p>
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
                        {stats.monthOverMonthChange > 0 ? '+' : ''}{stats.monthOverMonthChange.toFixed(1)}%
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
