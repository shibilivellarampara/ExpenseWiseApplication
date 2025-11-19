
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
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { generateColorStyle } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
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


const renderIcon = (iconName: string | undefined, className?: string) => {
  if (!iconName) return <LucideIcons.Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent ? <IconComponent className={cn("h-4 w-4 text-muted-foreground", className)} /> : <LucideIcons.Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
};


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
                                    {tx.type === 'income' ? '+' : '-'}{currencySymbol}{tx.amount.toFixed(2)}
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


const ResponsiveTransactionList = ({ category, transactions, currencySymbol, children }: { category: Stat | NetStat, transactions: EnrichedExpense[], currencySymbol: string, children: React.ReactNode }) => {
    const isDesktop = useMediaQuery("(min-width: 768px)");

    if (isDesktop) {
        return (
            <Dialog>
                <DialogTrigger asChild>{children}</DialogTrigger>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Transactions for "{category.categoryName}"</DialogTitle>
                    </DialogHeader>
                    <TransactionList transactions={transactions} currencySymbol={currencySymbol} />
                </DialogContent>
            </Dialog>
        );
    }

    return (
         <Drawer>
            <DrawerTrigger asChild>{children}</DrawerTrigger>
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle>Transactions for "{category.categoryName}"</DrawerTitle>
                </DrawerHeader>
                 <div className="px-4">
                    <TransactionList transactions={transactions} currencySymbol={currencySymbol} />
                </div>
            </DrawerContent>
        </Drawer>
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

    const isNetView = type === 'net';

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[40%]">Category</TableHead>
                    {isNetView && <TableHead className="text-right hidden md:table-cell">Income</TableHead>}
                    {isNetView && <TableHead className="text-right hidden md:table-cell">Expenses</TableHead>}
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Transactions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {stats.map(stat => {
                    const filteredTransactions = allExpenses.filter(e => (e.category?.id || 'uncategorized') === stat.categoryId && (type === 'net' || e.type === type));

                    let amountColor = 'text-foreground';
                    if (isNetView) {
                        amountColor = stat.total >= 0 ? 'text-green-600' : 'text-red-500';
                    } else {
                        amountColor = type === 'income' ? 'text-green-600' : 'text-red-500';
                    }
                    
                    return (
                        <ResponsiveTransactionList key={stat.categoryId} category={stat} transactions={filteredTransactions} currencySymbol={currencySymbol}>
                             <TableRow className="cursor-pointer hover:bg-muted/50">
                                <TableCell>
                                    <div className="font-medium">{stat.categoryName}</div>
                                    {!isNetView && (
                                        <>
                                            <div className="text-muted-foreground text-xs">{stat.percentage.toFixed(1)}% of total</div>
                                            <Progress value={stat.percentage} className="h-1 mt-1" />
                                        </>
                                    )}
                                </TableCell>
                                {isNetView && 'income' in stat && <TableCell className="text-right hidden md:table-cell text-green-600">{currencySymbol}{stat.income.toFixed(2)}</TableCell>}
                                {isNetView && 'expense' in stat && <TableCell className="text-right hidden md:table-cell text-red-500">{currencySymbol}{stat.expense.toFixed(2)}</TableCell>}
                                <TableCell className={cn("text-right font-bold", amountColor)}>
                                    {stat.total > 0 && isNetView ? '+' : ''}
                                    {currencySymbol}{stat.total.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right hidden md:table-cell">{stat.count}</TableCell>
                            </TableRow>
                        </ResponsiveTransactionList>
                    );
                })}
            </TableBody>
        </Table>
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
