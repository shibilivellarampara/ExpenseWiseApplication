'use client';

import { Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { useMemo } from 'react';
import { EnrichedExpense } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/currencies';
import { BarChart as BarChartIcon } from 'lucide-react';
import { format, eachMonthOfInterval, startOfMonth, endOfMonth, getYear } from 'date-fns';

interface SavingsTrendChartProps {
    expenses: EnrichedExpense[];
    currency?: string;
}

export function SavingsTrendChart({ expenses, currency }: SavingsTrendChartProps) {
    const currencySymbol = getCurrencySymbol(currency);

    const monthlySavingsData = useMemo(() => {
        if (expenses.length === 0) return [];

        const dataMap = new Map<string, { income: number; expense: number }>();
        const monthSet = new Set<string>();

        expenses.forEach(expense => {
            const monthKey = format(expense.date, 'yyyy-MM');
            monthSet.add(monthKey);

            if (!dataMap.has(monthKey)) {
                dataMap.set(monthKey, { income: 0, expense: 0 });
            }
            const monthData = dataMap.get(monthKey)!;

            if (expense.type === 'income') {
                monthData.income += expense.amount;
            } else {
                monthData.expense += expense.amount;
            }
        });
        
        const sortedMonths = Array.from(monthSet).sort();

        return sortedMonths.map(monthKey => {
            const [year, month] = monthKey.split('-');
            const monthDate = new Date(Number(year), Number(month) - 1);
            const monthData = dataMap.get(monthKey) || { income: 0, expense: 0 };
            const savings = monthData.income - monthData.expense;
            return {
                name: format(monthDate, 'MMM yy'),
                savings: savings,
            };
        });

    }, [expenses]);

    if (monthlySavingsData.length === 0) {
        return (
            <div className="flex h-[350px] w-full items-center justify-center rounded-lg border-2 border-dashed">
                <div className="flex flex-col items-center text-center text-muted-foreground">
                    <BarChartIcon className="h-12 w-12" />
                    <p className="mt-4">No data to display savings trend.</p>
                </div>
            </div>
        );
    }
    
    return (
        <ResponsiveContainer width="100%" height={350}>
            <RechartsBarChart data={monthlySavingsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${currencySymbol}${value}`} />
                <Tooltip
                    contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                    }}
                    formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Bar dataKey="savings" name="Monthly Savings">
                    {monthlySavingsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.savings >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-3))'} />
                    ))}
                </Bar>
            </RechartsBarChart>
        </ResponsiveContainer>
    );
}
