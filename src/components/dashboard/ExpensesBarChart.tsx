
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LegendProps } from 'recharts';
import { useMemo } from 'react';
import { EnrichedExpense, Category } from '@/lib/types';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval, startOfYear, endOfYear, getYear } from 'date-fns';
import { BarChart as BarChartIcon } from 'lucide-react';
import { CHART_COLORS } from '@/lib/colors';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { cn } from '@/lib/utils';


interface ExpensesBarChartProps {
  expenses: EnrichedExpense[];
  allCategories: Category[];
  timeRange: 'week' | 'month' | 'year' | '5year';
  currencySymbol: string;
  useCategoryColors: boolean;
}


const CustomTooltip = ({ active, payload, label, currencySymbol }: any) => {
    if (active && payload && payload.length) {
        const sortedPayload = payload
            .filter((p: any) => p.value > 0)
            .sort((a: any, b: any) => b.value - a.value);
        
        const total = sortedPayload.reduce((sum: number, p: any) => sum + p.value, 0);

        return (
            <div className="rounded-lg border bg-background p-2.5 shadow-sm text-sm">
                <div className="mb-2 font-bold">{label}</div>
                <div className="grid grid-cols-1 gap-1.5">
                    {sortedPayload.map((p: any, index: number) => (
                        <div key={index} className="flex justify-between items-center gap-2">
                             <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                                <span>{p.name}:</span>
                            </div>
                            <span className="font-mono font-medium">{currencySymbol}{p.value.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                 {sortedPayload.length > 1 && (
                    <>
                        <div className="my-1.5 h-px bg-border" />
                        <div className="flex justify-between font-bold">
                            <span>Total:</span>
                            <span>{currencySymbol}{total.toFixed(2)}</span>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return null;
};

const CustomLegend = ({ payload, onLegendClick, categoryColors }: LegendProps & { onLegendClick: (dataKey: string) => void, categoryColors: Map<string, string>}) => {
    if (!payload || payload.length === 0) return null;

    return (
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex justify-center items-center gap-4 text-xs pt-4">
          {payload.map((entry, index) => (
            <div
              key={`item-${index}`}
              className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => onLegendClick(entry.value as string)}
            >
              <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: categoryColors.get(entry.value as string) }} />
              <span>{entry.value}</span>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
};


export function ExpensesBarChart({ expenses, allCategories, timeRange, currencySymbol, useCategoryColors }: ExpensesBarChartProps) {
    const expenseOnlyData = useMemo(() => expenses.filter(e => e.type === 'expense'), [expenses]);
    
    // Determine top 6 categories + "Others"
    const { topCategories, categoryColors } = useMemo(() => {
        const categoryTotals = new Map<string, number>();
        expenseOnlyData.forEach(e => {
            const categoryName = e.category?.name || 'Uncategorized';
            categoryTotals.set(categoryName, (categoryTotals.get(categoryName) || 0) + e.amount);
        });

        const sortedCategories = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1]);
        const topCategoryNames = sortedCategories.slice(0, 6).map(([name]) => name);
        if (sortedCategories.length > 6) {
            topCategoryNames.push('Others');
        }

        const colors = new Map<string, string>();
        topCategoryNames.forEach((catName, index) => {
            if (catName === 'Others') {
                colors.set(catName, '#B0BEC5'); // Neutral gray for 'Others'
            } else {
                 colors.set(catName, CHART_COLORS[index % CHART_COLORS.length]);
            }
        });
        
        return { topCategories: topCategoryNames, categoryColors: colors };
    }, [expenseOnlyData]);

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
            topCategories.forEach(cat => {
                initialData[cat] = 0;
            });
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

            let categoryName = expense.category?.name || 'Uncategorized';
            if (!topCategories.includes(categoryName)) {
                categoryName = 'Others';
            }

            const dayData = dataMap.get(key);
            if (dayData) {
                dayData[categoryName] = (dayData[categoryName] || 0) + expense.amount;
                dayData.total = (dayData.total || 0) + expense.amount;
            }
        });

        return Array.from(dataMap.values());
    }, [expenseOnlyData, topCategories, timeRange]);

    
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
                    content={<CustomTooltip currencySymbol={currencySymbol} />}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                />
                {useCategoryColors && <Legend content={<CustomLegend onLegendClick={()=>{}} categoryColors={categoryColors} />} />}
                
                {useCategoryColors ? (
                    topCategories.map(categoryName => (
                        <Bar
                            key={categoryName}
                            dataKey={categoryName}
                            stackId="a"
                            fill={categoryColors.get(categoryName) || '#8884d8'}
                            name={categoryName}
                            radius={[4, 4, 0, 0]}
                        />
                    ))
                ) : (
                    <Bar
                        dataKey="total"
                        stackId="a"
                        fill="hsl(var(--primary))"
                        name="Total Expenses"
                        radius={[4, 4, 0, 0]}
                    />
                )}
            </BarChart>
        </ResponsiveContainer>
    );
}
