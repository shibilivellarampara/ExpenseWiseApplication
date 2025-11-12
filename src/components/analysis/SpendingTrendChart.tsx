'use client';

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMemo } from 'react';
import { EnrichedExpense } from '@/lib/types';
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, getYear, subMonths } from 'date-fns';
import { BarChart as BarChartIcon } from 'lucide-react';

interface SpendingTrendChartProps {
  expenses: EnrichedExpense[];
  timeRange: 'month' | '3-months' | 'year';
  currency?: string;
}

export function SpendingTrendChart({ expenses, timeRange, currency }: SpendingTrendChartProps) {
    
    const chartData = useMemo(() => {
        if (!expenses.length) return [];
        
        const now = new Date();
        const dataMap = new Map<string, { name: string; income: number; expense: number }>();
        let intervals: { key: string; name: string }[] = [];

        // 1. Initialize intervals and dataMap
        if (timeRange === 'month') {
            const start = startOfMonth(now);
            const end = endOfMonth(now);
            intervals = eachDayOfInterval({ start, end }).map(day => ({
                key: format(day, 'yyyy-MM-dd'),
                name: format(day, 'd'),
            }));
        } else if (timeRange === '3-months') {
            const start = startOfDay(subMonths(now, 2));
             intervals = eachWeekOfInterval({ start, end: now }, { weekStartsOn: 1 }).map(weekStart => ({
                key: format(weekStart, 'yyyy-MM-dd'),
                name: `W ${format(weekStart, 'd MMM')}`,
            }));
        } else { // 'year'
            const start = startOfYear(now);
            const end = endOfYear(now);
            intervals = eachMonthOfInterval({ start, end }).map(month => ({
                key: format(month, 'yyyy-MM'),
                name: format(month, 'MMM'),
            }));
        }

        intervals.forEach(interval => {
            dataMap.set(interval.key, { name: interval.name, income: 0, expense: 0 });
        });
        
        // 2. Populate dataMap with expenses
        expenses.forEach(expense => {
            let key: string;
            if (timeRange === 'month') {
                key = format(expense.date, 'yyyy-MM-dd');
            } else if (timeRange === '3-months') {
                key = format(startOfWeek(expense.date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            } else { // 'year'
                key = format(expense.date, 'yyyy-MM');
            }

            const periodData = dataMap.get(key);
            if (periodData) {
                if(expense.type === 'income') {
                    periodData.income += expense.amount;
                } else {
                    periodData.expense += expense.amount;
                }
            }
        });

        return Array.from(dataMap.values());
    }, [expenses, timeRange]);

    if (!expenses.length) {
        return (
            <div className="flex h-[350px] w-full items-center justify-center rounded-lg border-2 border-dashed">
                <div className="flex flex-col items-center text-center text-muted-foreground">
                    <BarChartIcon className="h-12 w-12" />
                    <p className="mt-4">No data for this period.</p>
                    <p className="text-sm">Your cash flow chart will appear here.</p>
                </div>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${currency}${value}`}
                />
                <Tooltip
                    contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                    }}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                 <Line type="monotone" dataKey="income" stroke="hsl(var(--primary))" strokeWidth={2} name="Income" />
                 <Line type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" strokeWidth={2} name="Expense" />
            </LineChart>
        </ResponsiveContainer>
    );
}
