
'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EnrichedExpense, Category, Tag } from "@/lib/types";
import { useMemo, useState } from "react";
import { getCurrencySymbol } from "@/lib/currencies";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ScrollArea } from "../ui/scroll-area";
import * as LucideIcons from 'lucide-react';
import { cn, formatAmount } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { generateColorStyle } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Button } from "../ui/button";
import { ChevronDown } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";

interface CategoryAnalysisTableProps {
    expenses: EnrichedExpense[];
    currency?: string;
}

interface Stat {
    categoryId: string;
    categoryName: string;
    total: number;
    count: number;
    percentage: number;
    average: number;
}

interface NetStat extends Stat {
    income: number;
    expense: number;
}

interface TagStat {
    tagId: string;
    tagName: string;
    icon: string;
    total: number;
    percentage: number;
}


const renderIcon = (iconName: string | undefined, className?: string) => {
  if (!iconName) return <LucideIcons.Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent ? <IconComponent className={cn("h-4 w-4 text-muted-foreground", className)} /> : <LucideIcons.Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
};

function TransactionDialog({ trigger, title, children }: { trigger: React.ReactNode; title: string; children: React.ReactNode }) {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    
    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                {children}
            </DialogContent>
        </Dialog>
    );
}

const TransactionList = ({ transactions, currencySymbol }: { transactions: EnrichedExpense[], currencySymbol: string }) => {
    return (
        <ScrollArea className="h-96">
            <div className="space-y-4 pr-6">
                {transactions.map(tx => (
                    <div key={tx.id} className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center mt-1">
                            {renderIcon(tx.category?.icon)}
                        </div>
                        <div className="flex-grow">
                            <div className="flex justify-between items-start">
                                <span className="font-medium break-all">{tx.description}</span>
                                <span className={cn("font-semibold whitespace-nowrap", tx.type === 'income' ? 'text-green-600' : 'text-red-500')}>
                                    {tx.type === 'income' ? '+' : '-'}{currencySymbol}{formatAmount(tx.amount)}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{tx.date.toLocaleDateString()}</p>
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                                 {tx.tags?.map(tag => (
                                    <Badge
                                        key={tag.id}
                                        style={generateColorStyle(tag.name)}
                                        className="badge-colorful text-xs"
                                    >
                                        {tag.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    )
};


const renderStatsTable = (stats: (Stat | NetStat)[], currencySymbol: string, allExpenses: EnrichedExpense[], type: 'income' | 'expense' | 'net') => {
    
    if (stats.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-10">
                <p>No data for this period.</p>
            </div>
        );
    }
    
    const calculateTagStats = (categoryId: string, categoryTotal: number, txType: 'income' | 'expense' | 'net'): TagStat[] => {
        const categoryTransactions = allExpenses.filter(e => {
            const sameCategory = e.category?.id === categoryId;
            if (txType === 'net') return sameCategory;
            return sameCategory && e.type === txType;
        });

        if (categoryTransactions.length === 0) return [];
        
        const tagMap = new Map<string, { total: number; name: string; icon: string }>();

        categoryTransactions.forEach(expense => {
            const amount = expense.type === 'income' ? expense.amount : -expense.amount;
            if (expense.tags.length > 0) {
                expense.tags.forEach(tag => {
                    const current = tagMap.get(tag.id) || { total: 0, name: tag.name, icon: tag.icon };
                    current.total += txType === 'net' ? amount : expense.amount;
                    tagMap.set(tag.id, current);
                });
            } else {
                 const current = tagMap.get('untagged') || { total: 0, name: 'Untagged', icon: 'Tag' };
                 current.total += txType === 'net' ? amount : expense.amount;
                 tagMap.set('untagged', current);
            }
        });
        
        const effectiveTotal = txType === 'net' ? 
            categoryTransactions.reduce((sum, tx) => sum + (tx.type === 'income' ? tx.amount : tx.amount), 0)
            : categoryTotal;

        return Array.from(tagMap.entries()).map(([tagId, data]) => ({
            tagId,
            tagName: data.name,
            icon: data.icon,
            total: data.total,
            percentage: effectiveTotal > 0 ? (data.total / effectiveTotal) * 100 : 0
        })).sort((a,b) => b.total - a.total);
    }


    const isNetView = type === 'net';

    return (
        <div className="text-sm">
            {/* Header */}
            <div className="flex items-center px-4 py-2 font-medium text-muted-foreground border-b">
                <div className="w-10"></div>
                <div className="flex-1">Category</div>
                {isNetView && <div className="hidden md:block text-right w-28">Income</div>}
                {isNetView && <div className="hidden md:block text-right w-28">Expenses</div>}
                <div className="text-right w-28">Total</div>
                <div className="hidden md:block text-right w-28">Transactions</div>
            </div>

             {/* Body */}
            <div>
                 {stats.map(stat => {
                    const filteredTransactions = allExpenses.filter(e => (e.category?.id || 'uncategorized') === stat.categoryId && (type === 'net' || e.type === type));
                    
                    let amountColor = 'text-foreground';
                    if (isNetView) {
                        amountColor = stat.total >= 0 ? 'text-green-600' : 'text-red-500';
                    } else {
                        amountColor = type === 'income' ? 'text-green-600' : 'text-red-500';
                    }

                    const tagStats = (stat.total !== 0) ? calculateTagStats(stat.categoryId, stat.total, type) : [];

                    
                    return (
                        <Collapsible key={stat.categoryId} className="border-b">
                            <div className="flex items-center px-4 py-3">
                                <div className="w-10">
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={tagStats.length === 0}>
                                            <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:-rotate-180" />
                                        </Button>
                                    </CollapsibleTrigger>
                                </div>
                                <div className="flex-1">
                                     <TransactionDialog 
                                        title={`Transactions for "${stat.categoryName}"`}
                                        trigger={
                                            <button className="text-left w-full">
                                                <div className="font-medium">{stat.categoryName}</div>
                                                {!isNetView && (
                                                    <>
                                                        <div className="text-muted-foreground text-xs">{stat.percentage.toFixed(1)}% of total</div>
                                                        <Progress value={stat.percentage} className="h-1 mt-1" />
                                                    </>
                                                )}
                                            </button>
                                        }
                                    >
                                        <TransactionList transactions={filteredTransactions} currencySymbol={currencySymbol} />
                                    </TransactionDialog>
                                </div>
                                {isNetView && 'income' in stat && <div className="hidden md:block text-right w-28 text-green-600">{currencySymbol}{formatAmount(stat.income)}</div>}
                                {isNetView && 'expense' in stat && <div className="hidden md:block text-right w-28 text-red-500">{currencySymbol}{formatAmount(stat.expense)}</div>}
                                <div className={cn("text-right font-bold w-28", amountColor)}>
                                    {stat.total > 0 && isNetView ? '+' : ''}
                                    {currencySymbol}{formatAmount(stat.total)}
                                </div>
                                <div className="hidden md:block text-right w-28">{stat.count}</div>
                            </div>
                            
                            <CollapsibleContent>
                                <div className="bg-muted/50 p-4 pl-14">
                                     <h4 className="text-sm font-semibold mb-3">Tag Breakdown</h4>
                                    <div className="space-y-3">
                                        {tagStats.map(tag => {
                                            const tagAmountColor = tag.total >= 0 ? 'text-green-700 dark:text-green-500' : 'text-red-700 dark:text-red-500';
                                            return (
                                                <div key={tag.tagId}>
                                                    <div className="flex justify-between items-center text-xs mb-1">
                                                        <div className="flex items-center gap-1.5">
                                                            {renderIcon(tag.icon, "h-3.5 w-3.5")}
                                                            <span className="font-medium">{tag.tagName}</span>
                                                        </div>
                                                        <span className={cn("font-mono", isNetView ? tagAmountColor : 'text-muted-foreground')}>
                                                            {isNetView && tag.total > 0 ? '+' : ''}
                                                            {currencySymbol}{formatAmount(tag.total)}
                                                        </span>
                                                    </div>
                                                     {!isNetView && <Progress value={tag.percentage} className="h-1" />}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    );
                })}
            </div>
        </div>
    );
}

export function CategoryAnalysisTable({ expenses, currency }: CategoryAnalysisTableProps) {
    const currencySymbol = getCurrencySymbol(currency);
    const router = useRouter();

    const categoryStats = useMemo(() => {
        const incomeTransactions = expenses.filter(e => e.type === 'income');
        const expenseTransactions = expenses.filter(e => e.type === 'expense');

        const processTransactions = (transactions: EnrichedExpense[]): Stat[] => {
            const totalAmount = transactions.reduce((sum, e) => sum + e.amount, 0);
            if (totalAmount === 0) return [];

            const statsMap = new Map<string, { total: number; count: number; categoryName: string }>();

            transactions.forEach(e => {
                const categoryId = e.category?.id || 'uncategorized';
                const categoryName = e.category?.name || 'Uncategorized';
                const current = statsMap.get(categoryId) || { total: 0, count: 0, categoryName };
                current.total += e.amount;
                current.count += 1;
                statsMap.set(categoryId, current);
            });

            return Array.from(statsMap.entries())
                .map(([categoryId, stat]) => ({
                    ...stat,
                    categoryId,
                    percentage: (stat.total / totalAmount) * 100,
                    average: stat.total / stat.count,
                }))
                .sort((a, b) => b.total - a.total);
        };

        const calculateNet = (): NetStat[] => {
            const netMap = new Map<string, { income: number; expense: number; count: number; categoryName: string }>();

            expenses.forEach(e => {
                const categoryId = e.category?.id || 'uncategorized';
                const categoryName = e.category?.name || 'Uncategorized';
                const current = netMap.get(categoryId) || { income: 0, expense: 0, count: 0, categoryName };
                
                if (e.type === 'income') {
                    current.income += e.amount;
                } else {
                    current.expense += e.amount;
                }
                current.count += 1;
                netMap.set(categoryId, current);
            });

            return Array.from(netMap.entries())
                .map(([categoryId, stat]) => {
                    const total = stat.income - stat.expense;
                    return {
                        ...stat,
                        categoryId,
                        total,
                        percentage: 0, // Percentage is not applicable for net view
                        average: total / stat.count
                    };
                })
                .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
        }
        
        return {
            income: processTransactions(incomeTransactions),
            expense: processTransactions(expenseTransactions),
            net: calculateNet(),
        }

    }, [expenses]);
    
    return (
        <Tabs defaultValue="expense">
            <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="expense">Expenses</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="net">Net</TabsTrigger>
            </TabsList>
            <TabsContent value="expense">
                {renderStatsTable(categoryStats.expense, currencySymbol, expenses, 'expense')}
            </TabsContent>
            <TabsContent value="income">
                {renderStatsTable(categoryStats.income, currencySymbol, expenses, 'income')}
            </TabsContent>
             <TabsContent value="net">
                {renderStatsTable(categoryStats.net, currencySymbol, expenses, 'net')}
            </TabsContent>
        </Tabs>
    );
}

    
