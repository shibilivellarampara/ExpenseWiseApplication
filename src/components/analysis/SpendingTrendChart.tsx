

'use client';

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMemo } from 'react';
import { EnrichedExpense } from '@/lib/types';
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, getYear, subMonths, subYears, eachYearOfInterval } from 'date-fns';
import { BarChart as BarChartIcon } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currencies';
import { formatAmount } from '@/lib/utils';

interface SpendingTrendChartProps {
  expenses: EnrichedExpense[];
  timeRange: 'week' | 'month' | 'last-month' | '3-months' | '6-months' | 'year' | 'last-year' | 'all' | 'specific-month' | 'custom';
  currency?: string;
}

export function SpendingTrendChart({ expenses, timeRange, currency }: SpendingTrendChartProps) {
    const currencySymbol = getCurrencySymbol(currency);
    
    const chartData = useMemo(() => {
        if (!expenses.length) return [];
        
        const now = new Date();
        const dataMap = new Map<string, { name: string; income: number; expense: number }>();
        let intervals: { key: string; name: string }[] = [];

        // 1. Determine date range
        let start: Date, end: Date;
        if(timeRange === 'all' || timeRange === 'custom' || timeRange === 'specific-month') {
            start = expenses.length > 0 ? expenses[expenses.length - 1].date : now;
            end = expenses.length > 0 ? expenses[0].date : now;
        } else {
             switch (timeRange) {
                case 'week':
                    start = startOfWeek(now);
                    end = endOfWeek(now);
                    break;
                case 'month':
                case 'last-month':
                    const targetDate = timeRange === 'month' ? now : subMonths(now, 1);
                    start = startOfMonth(targetDate);
                    end = endOfMonth(targetDate);
                    break;
                case '3-months':
                    start = startOfMonth(subMonths(now, 2));
                    end = now;
                    break;
                case '6-months':
                     start = startOfMonth(subMonths(now, 5));
                     end = now;
                     break;
                case 'year':
                     start = startOfYear(now);
                     end = endOfYear(now);
                     break;
                case 'last-year':
                    const lastYear = subYears(now, 1);
                    start = startOfYear(lastYear);
                    end = endOfYear(lastYear);
                    break;
                default:
                    start = startOfYear(now);
                    end = endOfYear(now);
                    break;
            }
        }


        // 2. Initialize intervals and dataMap based on range duration
        const diffDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);

        if (diffDays <= 31) { // Daily view
            intervals = eachDayOfInterval({ start, end }).map(day => ({
                key: format(day, 'yyyy-MM-dd'),
                name: format(day, 'd MMM'),
            }));
        } else if (diffDays <= 180) { // Weekly view for up to ~6 months
            intervals = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map(weekStart => ({
                key: format(weekStart, 'yyyy-ww'),
                name: `W ${format(weekStart, 'd MMM')}`,
            }));
        } else if (diffDays <= 366 * 2) { // Monthly view
            intervals = eachMonthOfInterval({ start, end }).map(month => ({
                key: format(month, 'yyyy-MM'),
                name: format(month, 'MMM yyyy'),
            }));
        } else { // Yearly view
             intervals = eachYearOfInterval({ start, end }).map(year => ({
                key: format(year, 'yyyy'),
                name: format(year, 'yyyy'),
            }));
        }

        intervals.forEach(interval => {
            dataMap.set(interval.key, { name: interval.name, income: 0, expense: 0 });
        });
        
        // 3. Populate dataMap with expenses
        expenses.forEach(expense => {
            let key: string;
             if (diffDays <= 31) { // Daily
                key = format(expense.date, 'yyyy-MM-dd');
            } else if (diffDays <= 180) { // Weekly
                key = format(startOfWeek(expense.date, { weekStartsOn: 1 }), 'yyyy-ww');
            } else if (diffDays <= 366 * 2) { // Monthly
                key = format(expense.date, 'yyyy-MM');
            } else { // Yearly
                key = format(expense.date, 'yyyy');
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

    const formatCurrency = (value: number) => {
        return `${currencySymbol}${formatAmount(value)}`;
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
                    tickFormatter={(value) => `${currencySymbol}${value}`}
                />
                <Tooltip
                    contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                    }}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    formatter={formatCurrency}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                 <Line type="monotone" dataKey="income" stroke="hsl(var(--primary))" strokeWidth={2} name="Income" />
                 <Line type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" strokeWidth={2} name="Expense" />
            </LineChart>
        </ResponsiveContainer>
    );
}

    
