
'use client';

import { useMemo, useState } from "react";
import { EnrichedExpense } from "@/lib/types";
import { getCurrencySymbol } from "@/lib/currencies";
import { cn, formatAmount, generateColorStyle } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from "@/lib/colors";

interface CategoryAnalysisTableProps {
    expenses: EnrichedExpense[];
    currency?: string;
}

export function CategoryAnalysisTable({ expenses, currency }: CategoryAnalysisTableProps) {
    const currencySymbol = getCurrencySymbol(currency);
    const [view, setView] = useState<'expense' | 'income' | 'net'>('expense');
    const [isExpanded, setIsExpanded] = useState(false);

    const stats = useMemo(() => {
        const filtered = expenses.filter(e => view === 'net' ? true : e.type === view);
        const totalAmount = filtered.reduce((sum, e) => sum + (view === 'net' ? (e.type === 'income' ? e.amount : -e.amount) : e.amount), 0);
        
        const map = new Map<string, { name: string; amount: number; count: number }>();
        filtered.forEach(e => {
            const catId = e.category?.id || 'other';
            const catName = e.category?.name || 'Uncategorized';
            const curr = map.get(catId) || { name: catName, amount: 0, count: 0 };
            curr.amount += view === 'net' ? (e.type === 'income' ? e.amount : -e.amount) : e.amount;
            curr.count += 1;
            map.set(catId, curr);
        });

        const data = Array.from(map.values())
            .map(item => ({
                ...item,
                percentage: totalAmount !== 0 ? (Math.abs(item.amount) / Math.abs(totalAmount)) * 100 : 0
            }))
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

        return { data, totalAmount };
    }, [expenses, view]);

    const top5 = stats.data.slice(0, 5);
    const chartData = top5.map(d => ({ name: d.name, value: Math.abs(d.amount) }));

    return (
        <Card className="rounded-[24px] border-none shadow-xl bg-card overflow-hidden">
            <CardContent className="p-0">
                <div className="flex items-center justify-between p-6">
                    <h3 className="font-bold text-lg">Top 5 Categories</h3>
                    <div className="flex items-center gap-3">
                        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="bg-muted/50 p-1 rounded-full">
                            <TabsList className="bg-transparent h-8 p-0">
                                <TabsTrigger value="expense" className="rounded-full text-[10px] h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">Expenses</TabsTrigger>
                                <TabsTrigger value="income" className="rounded-full text-[10px] h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">Income</TabsTrigger>
                                <TabsTrigger value="net" className="rounded-full text-[10px] h-7 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm">Net</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="h-8 w-8 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted transition-colors"
                        >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {!isExpanded ? (
                    <div className="px-6 pb-6 flex items-center gap-8">
                        <div className="h-32 w-32 shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        innerRadius={35}
                                        outerRadius={50}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {chartData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-grow space-y-3">
                            {top5.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                                        <span className="text-xs font-semibold truncate max-w-[100px]">{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold">{currencySymbol}{formatAmount(Math.abs(item.amount))}</p>
                                        <p className="text-[10px] text-muted-foreground">{item.percentage.toFixed(1)}%</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="px-6 pb-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Stacked Bar */}
                        <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted/30">
                            {top5.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    style={{ 
                                        width: `${item.percentage}%`, 
                                        backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] 
                                    }} 
                                />
                            ))}
                        </div>

                        {/* List */}
                        <div className="space-y-5">
                            {top5.map((item, idx) => (
                                <div key={idx} className="space-y-1.5">
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                                            <span className="text-sm font-bold">{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold">{currencySymbol}{formatAmount(Math.abs(item.amount))}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-grow h-1 rounded-full bg-muted/30">
                                            <div 
                                                className="h-full rounded-full transition-all duration-1000" 
                                                style={{ 
                                                    width: `${item.percentage}%`, 
                                                    backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] 
                                                }} 
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground w-8 text-right">{item.percentage.toFixed(1)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
