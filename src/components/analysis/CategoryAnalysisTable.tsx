
'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EnrichedExpense } from "@/lib/types";
import { useMemo } from "react";
import { getCurrencySymbol } from "@/lib/currencies";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import Link from 'next/link';
import { format } from "date-fns";

interface CategoryAnalysisTableProps {
    expenses: EnrichedExpense[];
    currency?: string;
    dateRange: { from: Date; to: Date };
}

interface Stat {
    categoryId: string;
    categoryName: string;
    total: number;
    count: number;
    percentage: number;
    average: number;
}

const renderStatsTable = (stats: Stat[], currencySymbol: string, dateRange: { from: Date; to: Date }) => {
    if (stats.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-10">
                <p>No data for this period.</p>
            </div>
        );
    }

    const fromDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const toDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[40%]">Category</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Transactions</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Average</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {stats.map(stat => {
                    const href = `/expenses?categories=${stat.categoryId}&dateFrom=${fromDate}&dateTo=${toDate}`;
                    return (
                        <TableRow key={stat.categoryId} className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                                <Link href={href} className="w-full h-full block">
                                    <div className="font-medium">{stat.categoryName}</div>
                                    <div className="text-muted-foreground text-xs">{stat.percentage.toFixed(1)}% of total</div>
                                    <Progress value={stat.percentage} className="h-1 mt-1" />
                                </Link>
                            </TableCell>
                             <TableCell className="text-right font-medium">
                                <Link href={href} className="w-full h-full block">
                                    {currencySymbol}{stat.total.toFixed(2)}
                                </Link>
                            </TableCell>
                            <TableCell className="text-right hidden md:table-cell">
                                <Link href={href} className="w-full h-full block">
                                    {stat.count}
                                </Link>
                            </TableCell>
                            <TableCell className="text-right hidden md:table-cell">
                                <Link href={href} className="w-full h-full block">
                                    {currencySymbol}{stat.average.toFixed(2)}
                                </Link>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}

export function CategoryAnalysisTable({ expenses, currency, dateRange }: CategoryAnalysisTableProps) {
    const currencySymbol = getCurrencySymbol(currency);

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
        
        return {
            income: processTransactions(incomeTransactions),
            expense: processTransactions(expenseTransactions),
        }

    }, [expenses]);
    
    return (
        <Tabs defaultValue="expense">
            <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="expense">Expenses</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
            <TabsContent value="expense">
                {renderStatsTable(categoryStats.expense, currencySymbol, dateRange)}
            </TabsContent>
            <TabsContent value="income">
                {renderStatsTable(categoryStats.income, currencySymbol, dateRange)}
            </TabsContent>
        </Tabs>
    );
}
