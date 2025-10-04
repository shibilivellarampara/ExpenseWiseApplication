'use client';

import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Suspense, useMemo } from 'react';
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart';
import { ExpensesBarChart } from '@/components/dashboard/ExpensesBarChart';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Expense, Category, EnrichedExpense } from '@/lib/types';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export default function DashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // A query for all expenses in the current and previous month
    const expensesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, `users/${user.uid}/expenses`),
            where('date', '>=', Timestamp.fromDate(lastMonthStart))
        );
    }, [user, firestore, lastMonthStart]);

    const categoriesQuery = useMemoFirebase(() => 
        user ? collection(firestore, `users/${user.uid}/categories`) : null
    , [firestore, user]);

    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

    const isLoading = expensesLoading || categoriesLoading;

    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);

    const enrichedExpenses = useMemo((): EnrichedExpense[] => {
        if (!expenses) return [];
        return expenses.map(expense => {
            const date = expense.date instanceof Date ? expense.date : expense.date.toDate();
            return {
                ...expense,
                date,
                category: categoryMap.get(expense.categoryId),
            };
        });
    }, [expenses, categoryMap]);
    
    // Filter expenses for current and last month for stats
    const currentMonthExpenses = useMemo(() => 
        enrichedExpenses.filter(e => e.date >= currentMonthStart && e.date <= currentMonthEnd)
    , [enrichedExpenses, currentMonthStart, currentMonthEnd]);

    const lastMonthExpenses = useMemo(() => 
        enrichedExpenses.filter(e => e.date >= lastMonthStart && e.date <= lastMonthEnd)
    , [enrichedExpenses, lastMonthStart, lastMonthEnd]);

    return (
        <div className="space-y-8">
            <PageHeader title="Welcome to your Dashboard" description="Here's a summary of your financial activity." />
      
            <DashboardStats 
              currentMonthExpenses={currentMonthExpenses} 
              lastMonthExpenses={lastMonthExpenses}
              isLoading={isLoading} 
            />

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle className="font-headline">Weekly Expenses</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        {isLoading ? (
                            <Skeleton className="h-[350px] w-full" />
                        ) : (
                            <ExpensesBarChart expenses={currentMonthExpenses} />
                        )}
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="font-headline">Spending by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                             <Skeleton className="h-[350px] w-full" />
                        ) : (
                             <CategoryPieChart expenses={currentMonthExpenses} />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
