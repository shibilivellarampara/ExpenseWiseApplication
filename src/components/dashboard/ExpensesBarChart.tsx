
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';
import { EnrichedExpense, Category } from '@/lib/types';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval, startOfYear, endOfYear, getYear, subYears } from 'date-fns';
import { BarChart as BarChartIcon } from 'lucide-react';
import { COLORS } from '@/lib/colors';

interface ExpensesBarChartProps {
  expenses: EnrichedExpense[];
  allCategories: Category[];
  timeRange: 'week' | 'month' | 'year' | '5year';
  currencySymbol: string;
  useCategoryColors: boolean;
}

export function ExpensesBarChart({ expenses, allCategories, timeRange, currencySymbol, useCategoryColors }: ExpensesBarChartProps) {
    const expenseOnlyData = useMemo(() => expenses.filter(e => e.type === 'expense'), [expenses]);

    const categoryColors = useMemo(() => {
        const colors = new Map<string, string>();
        allCategories.forEach((cat, index) => {
            colors.set(cat.name, COLORS[index % COLORS.length]);
        });
        colors.set('Uncategorized', '#B0BEC5'); // A neutral color for uncategorized
        return colors;
    }, [allCategories]);

    const chartData = useMemo(() => {
        if (!expenseOnlyData.length) return [];
        
        const now = new Date();
        const dataMap = new Map<string, { name: string; total: number, [key: string]: any }>();
        let intervals: { key: string; name: string }[] = [];

        // 1. Initialize intervals and dataMap
        if (timeRange === 'week') {
            const start = startOfWeek(now);
            const end = endOfWeek(now);
            intervals = eachDayOfInterval({ start, end }).map(day => ({
                key: format(day, 'yyyy-MM-dd'),
                name: format(day, 'EEE'),
            }));
        } else if (timeRange === 'month') {
            const start = startOfMonth(now);
            const end = endOfMonth(now);
            intervals = eachWeekOfInterval({ start, end }).map(weekStart => ({
                key: format(weekStart, 'yyyy-MM-dd'),
                name: `W ${format(weekStart, 'd')}`,
            }));
        } else if (timeRange === 'year') {
            const start = startOfYear(now);
            const end = endOfYear(now);
            intervals = eachMonthOfInterval({ start, end }).map(month => ({
                key: format(month, 'yyyy-MM'),
                name: format(month, 'MMM'),
            }));
        } else { // '5year'
            const currentYear = getYear(now);
            for (let i = 4; i >= 0; i--) {
                const year = currentYear - i;
                intervals.push({ key: String(year), name: String(year) });
            }
        }

        intervals.forEach(interval => {
            const initialData: { name: string; total: number; [key: string]: any } = { name: interval.name, total: 0 };
            allCategories.forEach(cat => {
                initialData[cat.name] = 0;
            });
            initialData['Uncategorized'] = 0;
            dataMap.set(interval.key, initialData);
        });
        
        // 2. Populate dataMap with expenses
        expenseOnlyData.forEach(expense => {
            let key: string;
            if (timeRange === 'week') {
                key = format(expense.date, 'yyyy-MM-dd');
            } else if (timeRange === 'month') {
                key = format(startOfWeek(expense.date), 'yyyy-MM-dd');
            } else if (timeRange === 'year') {
                key = format(expense.date, 'yyyy-MM');
            } else { // '5year'
                key = String(getYear(expense.date));
            }

            const categoryName = expense.category?.name || 'Uncategorized';
            const dayData = dataMap.get(key);
            if (dayData) {
                dayData[categoryName] = (dayData[categoryName] || 0) + expense.amount;
                dayData.total = (dayData.total || 0) + expense.amount;
            }
        });

        return Array.from(dataMap.values());
    }, [expenseOnlyData, allCategories, timeRange]);

    const categoriesWithExpenses = useMemo(() => {
        const activeCategories = new Set<string>();
        expenseOnlyData.forEach(e => {
            activeCategories.add(e.category?.name || 'Uncategorized');
        });
        // Sort categories to match the legend order with allCategories
        return allCategories
            .map(c => c.name)
            .filter(name => activeCategories.has(name))
            .concat(activeCategories.has('Uncategorized') ? ['Uncategorized'] : []);
    }, [expenseOnlyData, allCategories]);

    if (!expenseOnlyData.length) {
        return (
            <div className="flex h-[350px] w-full items-center justify-center rounded-lg border-2 border-dashed">
                <div className="flex flex-col items-center text-center text-muted-foreground">
                    <BarChartIcon className="h-12 w-12" />
                    <p className="mt-4">No expense data for this period.</p>
                    <p className="text-sm">Your spending chart will appear here.</p>
                </div>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
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
                    formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`}
                />
                {useCategoryColors && <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />}
                
                {useCategoryColors ? (
                    categoriesWithExpenses.map(categoryName => (
                        <Bar
                            key={categoryName}
                            dataKey={categoryName}
                            stackId="a"
                            fill={categoryColors.get(categoryName) || '#8884d8'}
                            name={categoryName}
                            radius={0}
                        />
                    ))
                ) : (
                    <Bar
                        dataKey="total"
                        stackId="a"
                        fill="hsl(var(--primary))"
                        name="Total Expenses"
                        radius={0}
                    />
                )}
            </BarChart>
        </ResponsiveContainer>
    );
}
