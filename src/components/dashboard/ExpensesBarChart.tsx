
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LegendProps } from 'recharts';
import { useMemo, useState } from 'react';
import { EnrichedExpense, Category } from '@/lib/types';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval, startOfYear, endOfYear, getYear } from 'date-fns';
import { BarChart as BarChartIcon } from 'lucide-react';
import { CHART_COLORS } from '@/lib/colors';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';


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

const CustomLegend = ({ onLegendClick, categoryColors, categoryTotals, totalExpense, currencySymbol, othersData }: { onLegendClick: (dataKey: string) => void, categoryColors: Map<string, string>, categoryTotals: Map<string, number>, totalExpense: number, currencySymbol: string, othersData: { name: string; value: number }[] }) => {
    const payload = Array.from(categoryTotals.keys()).map(name => ({
        value: name,
        color: categoryColors.get(name) || '#8884d8'
    }));

    if (!payload || payload.length === 0) return null;

    return (
        <ScrollArea className="h-full">
            <div className="space-y-2 p-2">
            {payload.map((entry, index) => {
                const categoryName = entry.value as string;
                const value = categoryTotals.get(categoryName) || 0;
                const percentage = totalExpense > 0 ? (value / totalExpense) * 100 : 0;
                
                if (categoryName === 'Others') {
                  return (
                    <Dialog key="others-legend">
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start text-sm p-2 rounded-md hover:bg-accent h-auto">
                                <div className="flex justify-between items-center w-full">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span className="truncate flex-1 text-left">{categoryName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="font-mono">
                                            {currencySymbol}{value.toFixed(2)}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground w-12 text-right">
                                            ({percentage.toFixed(1)}%)
                                        </span>
                                    </div>
                                </div>
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Other Categories</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-72">
                                <div className="space-y-2 p-2">
                                    {othersData.map((item, index) => (
                                        <div key={item.name} className="flex justify-between items-center text-sm p-2 rounded-md">
                                            <span>{item.name}</span>
                                            <Badge variant="secondary" className="font-mono">
                                                {currencySymbol}{item.value.toFixed(2)}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                  )
                }

                return (
                    <div
                        key={`item-${index}`}
                        className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-accent cursor-pointer"
                        onClick={() => onLegendClick(categoryName)}
                    >
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="truncate">{categoryName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono">
                                {currencySymbol}{value.toFixed(2)}
                            </Badge>
                             <span className="text-xs text-muted-foreground w-12 text-right">
                                ({percentage.toFixed(1)}%)
                            </span>
                        </div>
                    </div>
                );
            })}
            </div>
      </ScrollArea>
    );
};


export function ExpensesBarChart({ expenses, allCategories, timeRange, currencySymbol, useCategoryColors }: ExpensesBarChartProps) {
    const expenseOnlyData = useMemo(() => expenses.filter(e => e.type === 'expense'), [expenses]);
    
    // Determine top 7 categories + "Others"
    const { topCategories, categoryColors, categoryTotals, totalExpense, othersData } = useMemo(() => {
        const totals = new Map<string, number>();
        expenseOnlyData.forEach(e => {
            const categoryName = e.category?.name || 'Uncategorized';
            totals.set(categoryName, (totals.get(categoryName) || 0) + e.amount);
        });

        const sortedCategories = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
        
        const topN = 7;
        const topCategoryNames = sortedCategories.slice(0, topN).map(([name]) => name);
        let othersData: { name: string, value: number }[] = [];

        const finalCategoryTotals = new Map<string, number>();
        let othersTotal = 0;

        sortedCategories.forEach(([name, total]) => {
            if (topCategoryNames.includes(name)) {
                finalCategoryTotals.set(name, total);
            } else {
                othersTotal += total;
                othersData.push({ name, value: total });
            }
        });

        if (sortedCategories.length > topN) {
            topCategoryNames.push('Others');
            finalCategoryTotals.set('Others', othersTotal);
        }

        const colors = new Map<string, string>();
        topCategoryNames.forEach((catName, index) => {
            if (catName === 'Others') {
                colors.set(catName, '#B0BEC5'); // Neutral gray for 'Others'
            } else {
                 colors.set(catName, CHART_COLORS[index % CHART_COLORS.length]);
            }
        });

        const totalOverallExpense = Array.from(totals.values()).reduce((sum, val) => sum + val, 0);
        
        return { topCategories: topCategoryNames, categoryColors: colors, categoryTotals: finalCategoryTotals, totalExpense: totalOverallExpense, othersData };
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
        <div className="w-full flex flex-col h-[750px]">
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height={250}>
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
            </div>
            {useCategoryColors && (
                <div className="mt-4 flex-grow min-h-0">
                    <CustomLegend 
                        onLegendClick={()=>{}} 
                        categoryColors={categoryColors} 
                        categoryTotals={categoryTotals} 
                        totalExpense={totalExpense} 
                        currencySymbol={currencySymbol} 
                        othersData={othersData}
                    />
                </div>
            )}
        </div>
    );
}
