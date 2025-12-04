'use client';

import { PieChart as PieChartIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { EnrichedExpense } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/currencies';
import { CHART_COLORS } from '@/lib/colors';

interface TagSpendingChartProps {
    expenses: EnrichedExpense[];
    currency?: string;
}

export function TagSpendingChart({ expenses, currency }: TagSpendingChartProps) {
    const currencySymbol = getCurrencySymbol(currency);

    const tagData = useMemo(() => {
        const expenseTransactions = expenses.filter(e => e.type === 'expense');
        if (expenseTransactions.length === 0) return [];

        const dataMap = new Map<string, number>();

        expenseTransactions.forEach(item => {
            if (item.tags.length > 0) {
                const amountPerTag = item.amount / item.tags.length;
                item.tags.forEach(tag => {
                    dataMap.set(tag.name, (dataMap.get(tag.name) || 0) + amountPerTag);
                });
            } else {
                 dataMap.set('Untagged', (dataMap.get('Untagged') || 0) + item.amount);
            }
        });
        
        return Array.from(dataMap, ([name, value]) => ({ name, value }));

    }, [expenses]);

    if (tagData.length === 0) {
        return (
            <div className="flex h-[350px] w-full items-center justify-center rounded-lg border-2 border-dashed">
                <div className="flex flex-col items-center text-center text-muted-foreground">
                    <PieChartIcon className="h-12 w-12" />
                    <p className="mt-4">No tagged expenses in this period.</p>
                </div>
            </div>
        );
    }
    
    return (
        <ResponsiveContainer width="100%" height={350}>
            <PieChart>
                <Tooltip
                    contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                    }}
                    formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`}
                />
                 <Legend wrapperStyle={{ fontSize: "12px" }}/>
                <Pie
                    data={tagData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="hsl(var(--primary))"
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                        
                        if ((percent ?? 0) < 0.05) return null; // Hide label if it's too small

                        return (
                            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-medium">
                                {`${(percent * 100).toFixed(0)}%`}
                            </text>
                        );
                    }}
                >
                    {tagData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
}