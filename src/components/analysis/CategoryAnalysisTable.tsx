'use client';

import { useMemo, useState, useRef, useEffect } from "react";
import { EnrichedExpense, TagStat, CategoryStat } from "@/lib/types";
import { getCurrencySymbol } from "@/lib/currencies";
import { cn, formatAmount } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, Tag as LucideTag } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from "@/lib/colors";
import { CategoryTransactionsSheet } from "./CategoryTransactionsSheet";
import { Badge } from "@/components/ui/badge";
import { renderIcon } from "@/lib/render-icon";

interface CategoryAnalysisTableProps {
    expenses: EnrichedExpense[];
    currency?: string;
    excludedCategoryIds?: string[];
}

export function CategoryAnalysisTable({ expenses, currency, excludedCategoryIds = [] }: CategoryAnalysisTableProps) {
    const currencySymbol = getCurrencySymbol(currency);
    const [view, setView] = useState<'expense' | 'income' | 'net'>('expense');
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
    const [selectedCategory, setSelectedCategory] = useState<CategoryStat | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const stats = useMemo(() => {
        const filtered = expenses.filter(e => view === 'net' ? true : e.type === view);
        const totalAmount = filtered.reduce((sum, e) => sum + (view === 'net' ? (e.type === 'income' ? e.amount : -e.amount) : e.amount), 0);
        const absTotal = Math.abs(totalAmount);
        
        const map = new Map<string, { name: string; amount: number; count: number; rawExpenses: EnrichedExpense[] }>();
        
        filtered.forEach(e => {
            const catId = e.category?.id || 'other';
            const catName = e.category?.name || 'Uncategorized';
            const curr = map.get(catId) || { name: catName, amount: 0, count: 0, rawExpenses: [] };
            curr.amount += view === 'net' ? (e.type === 'income' ? e.amount : -e.amount) : e.amount;
            curr.count += 1;
            curr.rawExpenses.push(e);
            map.set(catId, curr);
        });

        const data: CategoryStat[] = Array.from(map.entries())
            .map(([id, item]) => {
                const tagMap = new Map<string, number>();
                item.rawExpenses.forEach(exp => {
                    if (exp.tags && exp.tags.length > 0) {
                        exp.tags.forEach(t => tagMap.set(t.name, (tagMap.get(t.name) || 0) + exp.amount));
                    } else {
                        tagMap.set('Untagged', (tagMap.get('Untagged') || 0) + exp.amount);
                    }
                });

                const tags: TagStat[] = Array.from(tagMap.entries())
                    .map(([name, amount]) => ({
                        name,
                        amount,
                        percentage: Math.abs(item.amount) > 0 ? (Math.abs(amount) / Math.abs(item.amount)) * 100 : 0
                    }))
                    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

                return {
                    id,
                    name: item.name,
                    amount: item.amount,
                    count: item.count,
                    percentage: absTotal !== 0 ? (Math.abs(item.amount) / absTotal) * 100 : 0,
                    tags
                };
            })
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

        return { data, totalAmount: absTotal };
    }, [expenses, view]);

    const top3 = stats.data.slice(0, 3);
    const top5 = stats.data.slice(0, 5);
    const chartData = stats.data.map(d => ({ name: d.name, value: Math.abs(d.amount) }));

    const toggleTags = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const next = new Set(expandedTags);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedTags(next);
    };

    const handleToggleExpand = () => {
        if (isExpanded) {
            setIsExpanded(false);
            setTimeout(() => {
                cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            setIsExpanded(true);
        }
    };

    return (
        <>
            <Card ref={cardRef} className="rounded-[24px] border-none shadow-xl bg-card overflow-hidden scroll-mt-20">
                <CardContent className="p-0">
                    <div className="flex items-center justify-between p-6 pb-2">
                        <h3 className="font-bold text-lg">{isExpanded ? 'All Categories' : 'Top 5 Categories'}</h3>
                        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="bg-muted/50 p-1 rounded-full shrink-0">
                            <TabsList className="bg-transparent h-10 p-0">
                                <TabsTrigger value="expense" className="rounded-full text-[12px] h-8 px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm">Expenses</TabsTrigger>
                                <TabsTrigger value="income" className="rounded-full text-[12px] h-8 px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm">Income</TabsTrigger>
                                <TabsTrigger value="net" className="rounded-full text-[12px] h-8 px-4 data-[state=active]:bg-card data-[state=active]:shadow-sm">Net</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="relative">
                        {/* Morphing Area: Donut -> Stacked Bar */}
                        <div className={cn(
                            "transition-all duration-500 ease-in-out px-6 overflow-hidden",
                            isExpanded ? "h-12 opacity-100" : "h-48 opacity-100"
                        )}>
                            {!isExpanded ? (
                                <div className="flex items-center gap-8 h-full animate-in fade-in duration-500">
                                    <div className="h-36 w-36 shrink-0 transition-transform duration-500 transform scale-100">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={chartData.slice(0, 5)}
                                                    innerRadius={45}
                                                    outerRadius={60}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                    animationDuration={500}
                                                >
                                                    {chartData.slice(0, 5).map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex-grow min-w-0 space-y-3">
                                        {top3.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                                                    <span className="text-[13px] font-medium truncate max-w-[90px]">{item.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[13px] font-medium">{currencySymbol}{formatAmount(Math.abs(item.amount))}</p>
                                                    {view !== 'net' && <p className="text-[10px] text-muted-foreground font-semibold">{item.percentage.toFixed(1)}%</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex items-center pt-4 animate-in fade-in zoom-in-95 duration-500 transform scale-x-100">
                                    <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted/30 shadow-inner">
                                        {stats.data.map((item, idx) => (
                                            <div 
                                                key={idx} 
                                                style={{ 
                                                    width: `${item.percentage}%`, 
                                                    backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] 
                                                }} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* List Area */}
                        <div className={cn(
                            "px-6 pb-6 space-y-6 transition-all duration-500",
                            isExpanded ? "pt-2 animate-in fade-in slide-in-from-top-4" : "hidden"
                        )}>
                            {stats.data.map((item, idx) => {
                                const isTagsOpen = expandedTags.has(item.id);
                                const color = CHART_COLORS[idx % CHART_COLORS.length];
                                const isHidden = excludedCategoryIds.includes(item.id);

                                return (
                                    <div key={item.id} className="space-y-3">
                                        <div 
                                            onClick={() => setSelectedCategory(item)}
                                            className="flex items-start gap-3 cursor-pointer group"
                                        >
                                            <div className="h-2 w-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: color }} />
                                            <div className="flex-grow min-w-0 space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={cn("text-sm font-medium truncate", isHidden && "text-muted-foreground/70")}>{item.name}</span>
                                                        {isHidden && <Badge variant="outline" className="h-3.5 text-[8px] uppercase font-bold text-muted-foreground/60 border-muted-foreground/20 px-1 rounded-full">Hidden</Badge>}
                                                    </div>
                                                    <p className="text-sm font-medium">{currencySymbol}{formatAmount(Math.abs(item.amount))}</p>
                                                </div>
                                                {view !== 'net' && (
                                                    <div className="text-[11px] font-semibold text-muted-foreground/70">{item.percentage.toFixed(1)}%</div>
                                                )}
                                                <div className="relative h-[3px] w-full bg-muted/30 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.percentage}%`, backgroundColor: color }} />
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => toggleTags(e, item.id)}
                                                className={cn("p-1 rounded-full hover:bg-muted group-hover:text-primary transition-all mt-0.5", isTagsOpen && "rotate-180")}
                                            >
                                                <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
                                            </button>
                                        </div>

                                        {isTagsOpen && (
                                            <div className="pl-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                {item.tags.map((tag, tIdx) => (
                                                    <div key={tIdx} className="flex items-start gap-3 border-l-[1.5px] border-muted pl-4">
                                                        <div className="flex-grow min-w-0 space-y-1.5">
                                                            <div className="flex justify-between items-center">
                                                                <p className="text-[11px] font-medium text-muted-foreground/80 flex items-center gap-1.5">
                                                                    <LucideTag className="h-3 w-3" />
                                                                    {tag.name}
                                                                </p>
                                                                <p className="text-[11px] font-medium text-muted-foreground/80">{currencySymbol}{formatAmount(Math.abs(tag.amount))}</p>
                                                            </div>
                                                            <div className="h-[2px] w-full bg-muted/20 rounded-full overflow-hidden">
                                                                <div className="h-full bg-muted-foreground/20" style={{ width: `${tag.percentage}%` }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button 
                        onClick={handleToggleExpand}
                        className="w-full py-4 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-primary hover:bg-muted/30 transition-all border-t border-border/50"
                    >
                        {isExpanded ? (
                            <>
                                <span>Show Less</span>
                                <ChevronUp className="h-4 w-4" />
                            </>
                        ) : (
                            <>
                                <span>View All Categories</span>
                                <ChevronDown className="h-4 w-4 transition-transform duration-300" />
                            </>
                        )}
                    </button>
                </CardContent>
            </Card>

            <CategoryTransactionsSheet 
                category={selectedCategory} 
                expenses={expenses}
                currency={currency}
                view={view}
                onClose={() => setSelectedCategory(null)}
            />
        </>
    );
}
