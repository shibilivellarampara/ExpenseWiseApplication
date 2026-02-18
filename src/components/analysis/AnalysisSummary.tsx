'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EnrichedExpense, Category } from "@/lib/types";
import { useMemo } from "react";
import { getCurrencySymbol } from "@/lib/currencies";
import { cn, formatAmount } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { renderIcon } from "@/lib/render-icon";

interface AnalysisSummaryProps {
    expenses: EnrichedExpense[];
    currency?: string;
    isLoading?: boolean;
    includeHidden: boolean;
    onIncludeHiddenChange: (value: boolean) => void;
    categories: Category[];
    excludedCategoryIds: string[];
}

export function AnalysisSummary({ isLoading, currency, expenses, includeHidden, onIncludeHiddenChange, categories, excludedCategoryIds }: AnalysisSummaryProps) {
    const currencySymbol = getCurrencySymbol(currency);

    const stats = useMemo(() => {
        const totalIn = expenses.filter(exp => exp.type === 'income').reduce((sum, exp) => sum + exp.amount, 0);
        const totalOut = expenses.filter(exp => exp.type === 'expense').reduce((sum, exp) => sum + exp.amount, 0);
        const netFlow = totalIn - totalOut;
        return { totalIn, totalOut, netFlow };
    }, [expenses]);

    const excludedCategories = useMemo(() => {
        return categories.filter(cat => excludedCategoryIds.includes(cat.id));
    }, [categories, excludedCategoryIds]);

    if (isLoading) {
        return <Skeleton className="h-44 w-full rounded-[24px]" />;
    }

    return (
        <Card className="rounded-[24px] border-none shadow-xl bg-card overflow-hidden">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Analysis Summary</p>
                        <p className={cn(
                            "text-2xl sm:text-4xl font-bold tracking-tight",
                            stats.netFlow >= 0 ? "text-green-600" : "text-destructive"
                        )}>
                            {currencySymbol}{formatAmount(stats.netFlow)}
                        </p>
                    </div>
                    <div className="text-right space-y-1 mt-1">
                        <div className="flex items-center justify-end gap-2">
                            <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">In:</span>
                            <span className="text-sm sm:text-lg font-bold text-green-600">{currencySymbol}{formatAmount(stats.totalIn)}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <span className="text-[10px] font-bold text-destructive uppercase tracking-widest">Out:</span>
                            <span className="text-sm sm:text-lg font-bold text-destructive">{currencySymbol}{formatAmount(stats.totalOut)}</span>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-muted/50 flex items-center justify-between">
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 py-2 group">
                                <span>Include Hidden Categories</span>
                                {excludedCategoryIds.length > 0 && (
                                    <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        {excludedCategoryIds.length}
                                    </Badge>
                                )}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-4 rounded-[20px] shadow-2xl border-none bg-card" align="start">
                            <div className="space-y-4">
                                <h4 className="font-bold text-sm">Hidden Categories</h4>
                                <Separator className="bg-muted/50" />
                                <ScrollArea className="h-40 pr-2">
                                    {excludedCategories.length > 0 ? (
                                        <div className="space-y-3">
                                            {excludedCategories.map(cat => (
                                                <div key={cat.id} className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground">
                                                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                                        {renderIcon(cat.icon, "h-3.5 w-3.5")}
                                                    </div>
                                                    <span>{cat.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-4">
                                            <p className="text-xs font-medium text-muted-foreground italic">No categories are currently hidden.</p>
                                        </div>
                                    )}
                                </ScrollArea>
                                <div className="pt-3 border-t border-muted/50">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 leading-relaxed">
                                        {includeHidden ? "Currently including hidden categories in calculations." : "Hidden categories are currently excluded from calculations."}
                                    </p>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Switch 
                        checked={includeHidden} 
                        onCheckedChange={onIncludeHiddenChange}
                        className="scale-75 origin-right"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
