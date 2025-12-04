'use client';

import { PieChart as PieChartIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { EnrichedExpense } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/currencies';
import { CHART_COLORS } from '@/lib/colors';

interface IncomeBreakdownChartProps {
    expenses: EnrichedExpense[];
    currency?: string;
}

export function IncomeBreakdownChart({ expenses, currency }: IncomeBreakdownChartProps) {
    const currencySymbol = getCurrencySymbol(currency);

    const incomeData = useMemo(() => {
        const incomeTransactions = expenses.filter(e => e.type === 'income');
        if (incomeTransactions.length === 0) return [];

        const dataMap = new Map<string, number>();

        incomeTransactions.forEach(item => {
            const key = item.category?.name || 'Uncategorized';
            dataMap.set(key, (dataMap.get(key) || 0) + item.amount);
        });
        
        return Array.from(dataMap, ([name, value]) => ({ name, value }));

    }, [expenses]);

    if (incomeData.length === 0) {
        return (
            <div className="flex h-[350px] w-full items-center justify-center rounded-lg border-2 border-dashed">
                <div className="flex flex-col items-center text-center text-muted-foreground">
                    <PieChartIcon className="h-12 w-12" />
                    <p className="mt-4">No income data for this period.</p>
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
                 <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: "12px", lineHeight: "20px", overflowY: "auto", maxHeight: 300 }}
                 />
                <Pie
                    data={incomeData}
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
                    {incomeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
}
