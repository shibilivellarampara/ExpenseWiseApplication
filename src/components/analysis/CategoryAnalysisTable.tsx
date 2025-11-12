
'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EnrichedExpense } from "@/lib/types";
import { useMemo } from "react";
import { getCurrencySymbol } from "@/lib/currencies";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface CategoryAnalysisTableProps {
    expenses: EnrichedExpense[];
    currency?: string;
}

const renderStatsTable = (stats: any[], currencySymbol: string) => {
    if (stats.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-10">
                <p>No data for this period.</p>
            </div>
        );
    }

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
                {stats.map(stat => (
                    <TableRow key={stat.categoryName}>
                        <TableCell>
                            <div className="font-medium">{stat.categoryName}</div>
                            <div className="text-muted-foreground text-xs">{stat.percentage.toFixed(1)}% of total</div>
                            <Progress value={stat.percentage} className="h-1 mt-1" />
                        </TableCell>
                        <TableCell className="text-right font-medium">{currencySymbol}{stat.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right hidden md:table-cell">{stat.count}</TableCell>
                        <TableCell className="text-right hidden md:table-cell">{currencySymbol}{stat.average.toFixed(2)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export function CategoryAnalysisTable({ expenses, currency }: CategoryAnalysisTableProps) {
    const currencySymbol = getCurrencySymbol(currency);

    const categoryStats = useMemo(() => {
        const incomeTransactions = expenses.filter(e => e.type === 'income' && e.category);
        const expenseTransactions = expenses.filter(e => e.type === 'expense' && e.category);

        const processTransactions = (transactions: EnrichedExpense[]) => {
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

            return Array.from(statsMap.values())
                .map(stat => ({
                    ...stat,
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
                {renderStatsTable(categoryStats.expense, currencySymbol)}
            </TabsContent>
            <TabsContent value="income">
                {renderStatsTable(categoryStats.income, currencySymbol)}
            </TabsContent>
        </Tabs>
    );
}
