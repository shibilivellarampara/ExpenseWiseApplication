
'use client';

import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo, useState } from 'react';
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart';
import { ExpensesBarChart } from '@/components/dashboard/ExpensesBarChart';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Expense, Category, EnrichedExpense, UserProfile, Account, Tag } from '@/lib/types';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, format, startOfYear, endOfYear } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCurrencySymbol } from '@/lib/currencies';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PieChartGrouping = 'category' | 'account' | 'tag';

export default function DashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
    const [pieChartGrouping, setPieChartGrouping] = useState<PieChartGrouping>('category');

    const dateRanges = useMemo(() => {
        const now = new Date();
        return {
            currentMonthStart: startOfMonth(now),
            currentMonthEnd: endOfMonth(now),
            lastMonthStart: startOfMonth(subMonths(now, 1)),
            lastMonthEnd: endOfMonth(subMonths(now, 1)),
            currentWeekStart: startOfWeek(now),
            currentWeekEnd: endOfWeek(now),
            currentYearStart: startOfYear(now),
            currentYearEnd: endOfYear(now),
        };
    }, []);

    const expensesQuery = useMemoFirebase(() => {
        if (!user) return null;
        const startDate = dateRanges.lastMonthStart;
        return query(
            collection(firestore, `users/${user.uid}/expenses`),
            where('date', '>=', Timestamp.fromDate(startDate))
        );
    }, [user, firestore, dateRanges.lastMonthStart]);
    
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const categoriesQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/categories`) : null, [firestore, user]);
    const accountsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/accounts`) : null, [firestore, user]);
    const tagsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/tags`) : null, [firestore, user]);

    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);
    const { data: tags, isLoading: tagsLoading } = useCollection<Tag>(tagsQuery);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const isLoading = expensesLoading || categoriesLoading || profileLoading || accountsLoading || tagsLoading;
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(accounts?.map(a => [a.id, a])), [accounts]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);

    const enrichedExpenses = useMemo((): EnrichedExpense[] => {
        if (!expenses || !categoryMap.size || !accountMap.size) return [];
        return expenses.map(expense => {
            const date = expense.date instanceof Date ? expense.date : expense.date.toDate();
            return {
                ...expense,
                date,
                category: categoryMap.get(expense.categoryId),
                account: accountMap.get(expense.accountId),
                tag: expense.tagId ? tagMap.get(expense.tagId) : undefined,
            };
        });
    }, [expenses, categoryMap, accountMap, tagMap]);
    
    // Filter expenses for various time ranges
    const currentMonthExpenses = useMemo(() => 
        enrichedExpenses.filter(e => e.date >= dateRanges.currentMonthStart && e.date <= dateRanges.currentMonthEnd)
    , [enrichedExpenses, dateRanges.currentMonthStart, dateRanges.currentMonthEnd]);

    const lastMonthExpenses = useMemo(() => 
        enrichedExpenses.filter(e => e.date >= dateRanges.lastMonthStart && e.date <= dateRanges.lastMonthEnd)
    , [enrichedExpenses, dateRanges.lastMonthStart, dateRanges.lastMonthEnd]);
    
    const currentWeekExpenses = useMemo(() =>
        enrichedExpenses.filter(e => e.date >= dateRanges.currentWeekStart && e.date <= dateRanges.currentWeekEnd)
    , [enrichedExpenses, dateRanges.currentWeekStart, dateRanges.currentWeekEnd]);
    
    const currentYearExpenses = useMemo(() =>
        enrichedExpenses.filter(e => e.date >= dateRanges.currentYearStart && e.date <= dateRanges.currentYearEnd)
    , [enrichedExpenses, dateRanges.currentYearStart, dateRanges.currentYearEnd]);


    const chartData = timeRange === 'year' ? currentYearExpenses : (timeRange === 'week' ? currentWeekExpenses : currentMonthExpenses);

    const pieChartData = useMemo(() => {
        const expenseOnly = currentMonthExpenses.filter(e => e.type === 'expense');
        const dataMap = new Map<string, number>();

        expenseOnly.forEach(item => {
            let key: string | undefined;
            switch(pieChartGrouping) {
                case 'category':
                    key = item.category?.name;
                    break;
                case 'account':
                    key = item.account?.name;
                    break;
                case 'tag':
                    key = item.tag?.name;
                    break;
            }
            if (!key) {
                key = pieChartGrouping === 'tag' ? 'Untagged' : 'Uncategorized';
            }
            dataMap.set(key, (dataMap.get(key) || 0) + item.amount);
        });
        return Array.from(dataMap, ([name, value]) => ({ name, value }));
    }, [currentMonthExpenses, pieChartGrouping]);


    return (
        <div className="w-full max-w-7xl mx-auto space-y-8">
            <PageHeader title="Welcome to your Dashboard" description="Here's a summary of your financial activity." />
      
            <DashboardStats 
              currentMonthExpenses={currentMonthExpenses} 
              lastMonthExpenses={lastMonthExpenses}
              isLoading={isLoading}
              currency={userProfile?.defaultCurrency}
            />

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as 'week' | 'month' | 'year')}>
                        <CardHeader className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                            <CardTitle className="font-headline">Expenses Overview</CardTitle>
                             <TabsList>
                                <TabsTrigger value="week">W</TabsTrigger>
                                <TabsTrigger value="month">M</TabsTrigger>
                                <TabsTrigger value="year">Y</TabsTrigger>
                            </TabsList>
                        </CardHeader>
                        <CardContent className="pl-2">
                             {isLoading ? (
                                <Skeleton className="h-[350px] w-full" />
                            ) : (
                                <>
                                    <TabsContent value="week">
                                        <ExpensesBarChart expenses={chartData} timeRange="week" currencySymbol={currencySymbol}/>
                                    </TabsContent>
                                    <TabsContent value="month">
                                        <ExpensesBarChart expenses={chartData} timeRange="month" currencySymbol={currencySymbol}/>
                                    </TabsContent>
                                    <TabsContent value="year">
                                        <ExpensesBarChart expenses={chartData} timeRange="year" currencySymbol={currencySymbol}/>
                                    </TabsContent>
                                </>
                            )}
                        </CardContent>
                    </Tabs>
                </Card>
                <Card className="lg:col-span-3">
                     <CardHeader>
                        <CardTitle className="font-headline">Spending Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Tabs value={pieChartGrouping} onValueChange={(value) => setPieChartGrouping(value as PieChartGrouping)}>
                             <TabsList className="grid w-full grid-cols-3 mb-4">
                                <TabsTrigger value="category">Category</TabsTrigger>
                                <TabsTrigger value="account">Account</TabsTrigger>
                                <TabsTrigger value="tag">Tag</TabsTrigger>
                            </TabsList>
                            {isLoading ? (
                                <Skeleton className="h-[350px] w-full" />
                            ) : (
                                <CategoryPieChart data={pieChartData} currencySymbol={currencySymbol} />
                            )}
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
