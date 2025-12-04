'use client';

import { Bar, BarChart as RechartsBarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMemo } from 'react';
import { EnrichedExpense } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/currencies';
import { BarChart as BarChartIcon } from 'lucide-react';
import { CHART_COLORS } from '@/lib/colors';

interface CategoryBarChartProps {
    expenses: EnrichedExpense[];
    currency?: string;
}

export function CategoryBarChart({ expenses, currency }: CategoryBarChartProps) {
    const currencySymbol = getCurrencySymbol(currency);

    const categoryData = useMemo(() => {
        const expenseTransactions = expenses.filter(e => e.type === 'expense');
        if (expenseTransactions.length === 0) return [];

        const dataMap = new Map<string, number>();

        expenseTransactions.forEach(item => {
            const key = item.category?.name || 'Uncategorized';
            dataMap.set(key, (dataMap.get(key) || 0) + item.amount);
        });
        
        return Array.from(dataMap, ([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10);

    }, [expenses]);

    if (categoryData.length === 0) {
        return (
            <div className="flex h-[350px] w-full items-center justify-center rounded-lg border-2 border-dashed">
                <div className="flex flex-col items-center text-center text-muted-foreground">
                    <BarChartIcon className="h-12 w-12" />
                    <p className="mt-4">No expense data for this period.</p>
                </div>
            </div>
        );
    }
    
    return (
        <ResponsiveContainer width="100%" height={350}>
            <RechartsBarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${currencySymbol}${value}`} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <Tooltip
                    contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                    }}
                    formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Bar dataKey="value" name="Total Spent" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
            </RechartsBarChart>
        </ResponsiveContainer>
    );
}
