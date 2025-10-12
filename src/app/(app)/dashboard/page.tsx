
'use client';

import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMemo, useState } from 'react';
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart';
import { ExpensesBarChart } from '@/components/dashboard/ExpensesBarChart';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Expense, Category, EnrichedExpense, UserProfile, Account, Tag } from '@/lib/types';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, format, startOfYear, endOfYear, subYears } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCurrencySymbol } from '@/lib/currencies';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { AddAccountSheet } from '@/components/accounts/AddAccountSheet';

type PieChartGrouping = 'category' | 'account' | 'tag';
type TimeRange = 'week' | 'month' | 'year' | '5year';

function WelcomeCard() {
    return (
        <Card className="bg-primary/10 border-primary/50">
            <CardHeader>
                <CardTitle className="font-headline text-primary">Welcome to ExpenseWise!</CardTitle>
                <CardDescription>It looks like you're new here. To get started, add your first financial account.</CardDescription>
            </CardHeader>
            <CardContent>
                <AddAccountSheet>
                     <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Your First Account
                    </Button>
                </AddAccountSheet>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [timeRange, setTimeRange] = useState<TimeRange>('week');
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
            fiveYearsAgoStart: startOfYear(subYears(now, 4)),
        };
    }, []);

    const expensesQuery = useMemoFirebase(() => {
        if (!user) return null;
        // Fetch a broader range to cover all tabs without re-querying
        const startDate = dateRanges.fiveYearsAgoStart; 
        return query(
            collection(firestore, `users/${user.uid}/expenses`),
            where('date', '>=', Timestamp.fromDate(startDate))
        );
    }, [user, firestore, dateRanges.fiveYearsAgoStart]);
    
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
    const show5YearView = userProfile?.dashboardSettings?.show5YearView ?? false;

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
                tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
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

    const last5YearsExpenses = useMemo(() =>
        enrichedExpenses.filter(e => e.date >= dateRanges.fiveYearsAgoStart && e.date <= dateRanges.currentYearEnd)
    , [enrichedExpenses, dateRanges.fiveYearsAgoStart, dateRanges.currentYearEnd]);


    const chartData = useMemo(() => {
        switch (timeRange) {
            case 'week': return currentWeekExpenses;
            case 'month': return currentMonthExpenses;
            case 'year': return currentYearExpenses;
            case '5year': return last5YearsExpenses;
            default: return currentWeekExpenses;
        }
    }, [timeRange, currentWeekExpenses, currentMonthExpenses, currentYearExpenses, last5YearsExpenses]);

    const generatePieChartData = (grouping: PieChartGrouping) => {
        const expenseOnly = currentMonthExpenses.filter(e => e.type === 'expense');
        const dataMap = new Map<string, number>();

        expenseOnly.forEach(item => {
            let keys: string[] = [];
            if (grouping === 'tag') {
                if (item.tags.length > 0) {
                     item.tags.forEach(tag => keys.push(tag.name));
                } else {
                    keys.push('Untagged');
                }
            } else {
                let key: string | undefined;
                switch(grouping) {
                    case 'category':
                        key = item.category?.name || 'Uncategorized';
                        break;
                    case 'account':
                        key = item.account?.name;
                        break;
                }
                if (key) {
                    keys.push(key);
                }
            }
            
            const amountPerKey = keys.length > 0 ? item.amount / keys.length : item.amount;
            keys.forEach(key => {
                 dataMap.set(key, (dataMap.get(key) || 0) + amountPerKey);
            })
        });
        return Array.from(dataMap, ([name, value]) => ({ name, value }));
    };
    
    const pieChartCategoryData = useMemo(() => generatePieChartData('category'), [currentMonthExpenses, categories]);
    const pieChartAccountData = useMemo(() => generatePieChartData('account'), [currentMonthExpenses, accounts]);
    const pieChartTagData = useMemo(() => generatePieChartData('tag'), [currentMonthExpenses, tags]);

    const useCategoryColors = userProfile?.dashboardSettings?.useCategoryColorsInChart ?? true;

    return (
        <div className="w-full space-y-8">
            <PageHeader title="Welcome to your Dashboard" description="Here's a summary of your financial activity." />
      
             {!isLoading && accounts?.length === 0 && (
                <WelcomeCard />
            )}

            {accounts && accounts.length > 0 && (
                <>
                    <DashboardStats 
                        currentMonthExpenses={currentMonthExpenses} 
                        lastMonthExpenses={lastMonthExpenses}
                        isLoading={isLoading}
                        currency={userProfile?.defaultCurrency}
                    />

                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="lg:col-span-4">
                            <CardHeader>
                                <CardTitle className="font-headline">Expenses Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                                    <TabsList className={`grid w-full grid-cols-${show5YearView ? 4 : 3} mb-4`}>
                                        <TabsTrigger value="week">This Week</TabsTrigger>
                                        <TabsTrigger value="month">This Month</TabsTrigger>
                                        <TabsTrigger value="year">This Year</TabsTrigger>
                                        {show5YearView && <TabsTrigger value="5year">5 Years</TabsTrigger>}
                                    </TabsList>
                                    {isLoading ? (
                                        <Skeleton className="h-[350px] w-full" />
                                    ) : (
                                        <>
                                            <TabsContent value="week">
                                                <ExpensesBarChart expenses={chartData} allCategories={categories || []} timeRange="week" currencySymbol={currencySymbol} useCategoryColors={useCategoryColors}/>
                                            </TabsContent>
                                            <TabsContent value="month">
                                                <ExpensesBarChart expenses={chartData} allCategories={categories || []} timeRange="month" currencySymbol={currencySymbol} useCategoryColors={useCategoryColors}/>
                                            </TabsContent>
                                            <TabsContent value="year">
                                                <ExpensesBarChart expenses={chartData} allCategories={categories || []} timeRange="year" currencySymbol={currencySymbol} useCategoryColors={useCategoryColors}/>
                                            </TabsContent>
                                            {show5YearView && (
                                                <TabsContent value="5year">
                                                    <ExpensesBarChart expenses={chartData} allCategories={categories || []} timeRange="5year" currencySymbol={currencySymbol} useCategoryColors={useCategoryColors}/>
                                                </TabsContent>
                                            )}
                                        </>
                                    )}
                                </Tabs>
                            </CardContent>
                        </Card>
                        <Card className="lg:col-span-3">
                            <CardHeader>
                                <CardTitle className="font-headline">Spending Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="category" value={pieChartGrouping} onValueChange={(value) => setPieChartGrouping(value as PieChartGrouping)}>
                                    <TabsList className="grid w-full grid-cols-3 mb-4">
                                        <TabsTrigger value="category">Category</TabsTrigger>
                                        <TabsTrigger value="account">Account</TabsTrigger>
                                        <TabsTrigger value="tag">Tag</TabsTrigger>
                                    </TabsList>
                                    {isLoading ? (
                                        <Skeleton className="h-[350px] w-full" />
                                    ) : (
                                        <>
                                            <TabsContent value="category">
                                                <CategoryPieChart data={pieChartCategoryData} currencySymbol={currencySymbol} />
                                            </TabsContent>
                                            <TabsContent value="account">
                                                <CategoryPieChart data={pieChartAccountData} currencySymbol={currencySymbol} />
                                            </TabsContent>
                                            <TabsContent value="tag">
                                                <CategoryPieChart data={pieChartTagData} currencySymbol={currencySymbol} />
                                            </TabsContent>
                                        </>
                                    )}
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
