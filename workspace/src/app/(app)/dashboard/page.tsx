'use client';

import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMemo, useState, useEffect } from 'react';
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart';
import { ExpensesBarChart } from '@/components/dashboard/ExpensesBarChart';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Expense, Category, EnrichedExpense, UserProfile, Account, Tag } from '@/lib/types';
import { collection, query, where, Timestamp, doc, getDocs, limit, orderBy } from 'firebase/firestore';
import { startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, format, startOfYear, endOfYear, getYear, subYears } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCurrencySymbol } from '@/lib/currencies';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Upload } from 'lucide-react';
import { AddAccountSheet } from '@/components/accounts/AddAccountSheet';
import { A2HSInstallPrompt } from '@/components/pwa/A2HSInstallPrompt';
import { cn } from '@/lib/utils';

const featuredCardClass = "rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_-8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)] -translate-y-0.5 border-none overflow-hidden bg-card transition-all duration-300";

function WelcomeCard() {
    return (
        <Card className={cn(featuredCardClass, "bg-primary/5 border-primary/10")}>
            <CardHeader>
                <CardTitle className="font-headline text-primary">Welcome to ExpenseWise!</CardTitle>
                <CardDescription>It looks like you're new here. Let's get you started.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <AddAccountSheet>
                         <Button className="w-full">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Your First Account
                        </Button>
                    </AddAccountSheet>
                    <Button variant="outline" asChild className="w-full">
                        <Link href="/data">
                            <Upload className="mr-2 h-4 w-4" />
                            Restore from Backup
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}


function NewUserCheck() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isNewUser, setIsNewUser] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    const expensesQuery = useMemoFirebase(() => {
        if (!user || (typeof window !== 'undefined' && window.sessionStorage.getItem('hasCheckedNewUser'))) {
            return null;
        }
        return query(collection(firestore, `users/${user.uid}/expenses`), limit(1));
    }, [user, firestore]);

    const { data: expenses, isLoading } = useCollection<Expense>(expensesQuery);
    
    useEffect(() => {
        if (typeof window !== 'undefined' && window.sessionStorage.getItem('hasCheckedNewUser')) {
            setIsChecking(false);
            setIsNewUser(false);
            return;
        }

        if (!isLoading) {
            setIsChecking(false);
            if (expenses) {
                const newUserStatus = expenses.length === 0;
                setIsNewUser(newUserStatus);
                if (typeof window !== 'undefined') {
                    window.sessionStorage.setItem('hasCheckedNewUser', 'true');
                }
            } else {
                setIsNewUser(false);
            }
        }
    }, [expenses, isLoading]);


    if (isChecking) {
         return (
            <div className="space-y-6">
                <Skeleton className="h-44 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
            </div>
        );
    }

    if (isNewUser) {
        return (
            <div className="space-y-6">
                <WelcomeCard />
                <A2HSInstallPrompt />
            </div>
        );
    }

    return null;
}

type TimeRange = 'week' | 'month' | 'year' | '5year';
type PieChartGrouping = 'category' | 'account' | 'tag';

export default function DashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [pieChartGrouping, setPieChartGrouping] = useState<PieChartGrouping>('category');

    const { dateRangeStart, dateRangeEnd, timeRangeLabel } = useMemo(() => {
        const now = new Date();
        switch (timeRange) {
            case 'week':
                return { dateRangeStart: startOfWeek(now), dateRangeEnd: endOfWeek(now), timeRangeLabel: 'this week' };
            case 'month':
                return { dateRangeStart: startOfMonth(now), dateRangeEnd: endOfMonth(now), timeRangeLabel: 'this month' };
            case 'year':
                return { dateRangeStart: startOfYear(now), dateRangeEnd: endOfYear(now), timeRangeLabel: 'this year' };
            case '5year':
                 return { dateRangeStart: startOfYear(subYears(now, 4)), dateRangeEnd: endOfYear(now), timeRangeLabel: 'the last 5 years' };
            default:
                return { dateRangeStart: startOfWeek(now), dateRangeEnd: endOfWeek(now), timeRangeLabel: 'this week' };
        }
    }, [timeRange]);

    const chartExpensesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, `users/${user.uid}/expenses`),
            where('date', '>=', Timestamp.fromDate(dateRangeStart)),
            where('date', '<=', Timestamp.fromDate(dateRangeEnd))
        );
    }, [user, firestore, dateRangeStart, dateRangeEnd]);
    
    const thisMonthRange = useMemo(() => {
        const now = new Date();
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }, []);

    const lastMonthRange = useMemo(() => {
        const now = new Date();
        return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    }, []);

    const thisMonthExpensesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, `users/${user.uid}/expenses`),
            where('date', '>=', Timestamp.fromDate(thisMonthRange.start)),
            where('date', '<=', Timestamp.fromDate(thisMonthRange.end))
        );
    }, [user, firestore, thisMonthRange]);

    const lastMonthExpensesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, `users/${user.uid}/expenses`),
            where('date', '>=', Timestamp.fromDate(lastMonthRange.start)),
            where('date', '<=', Timestamp.fromDate(lastMonthRange.end))
        );
    }, [user, firestore, lastMonthRange]);

    
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const categoriesQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/categories`) : null, [firestore, user]);
    const accountsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/accounts`) : null, [firestore, user]);
    const tagsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/tags`), orderBy('name', 'asc')) : null, [firestore, user]);

    const { data: chartExpenses, isLoading: chartExpensesLoading } = useCollection<Expense>(chartExpensesQuery);
    const { data: thisMonthExpenses, isLoading: thisMonthLoading } = useCollection<Expense>(thisMonthExpensesQuery);
    const { data: lastMonthExpenses, isLoading: lastMonthLoading } = useCollection<Expense>(lastMonthExpensesQuery);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);
    const { data: tags, isLoading: tagsLoading } = useCollection<Tag>(tagsQuery);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const isLoading = chartExpensesLoading || thisMonthLoading || lastMonthLoading || categoriesLoading || accountsLoading || tagsLoading;
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);
    const show5YearView = userProfile?.dashboardSettings?.show5YearView ?? false;

    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(accounts?.map(a => [a.id, a])), [accounts]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);

    const enrichExpenses = (expenseList: Expense[] | null): EnrichedExpense[] => {
        if (!expenseList || !categoryMap.size || !accountMap.size) return [];
    
        return expenseList.reduce<EnrichedExpense[]>((acc, expense) => {
            if (!expense.accountId) return acc;
            
            const account = accountMap.get(expense.accountId);
            if (!account) return acc;
    
            const enriched: EnrichedExpense = {
                ...expense,
                date: expense.date instanceof Date ? expense.date : expense.date.toDate(),
                category: expense.categoryId ? categoryMap.get(expense.categoryId) : undefined,
                account: account,
                tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
            };
    
            acc.push(enriched);
            return acc;
        }, []);
    };
    
    const enrichedChartExpenses = useMemo(() => enrichExpenses(chartExpenses), [chartExpenses, categoryMap, accountMap, tagMap]);
    const enrichedThisMonthExpenses = useMemo(() => enrichExpenses(thisMonthExpenses), [thisMonthExpenses, categoryMap, accountMap, tagMap]);
    const enrichedLastMonthExpenses = useMemo(() => enrichExpenses(lastMonthExpenses), [lastMonthExpenses, categoryMap, accountMap, tagMap]);

    const generatePieChartData = (grouping: PieChartGrouping) => {
        const dataMap = new Map<string, number>();
        const expenseOnly = enrichedChartExpenses.filter(e => e.type === 'expense');

        if (grouping === 'category') {
            expenseOnly.forEach(item => {
                const key = item.category?.name || 'Uncategorized';
                dataMap.set(key, (dataMap.get(key) || 0) + item.amount);
            });
        } else if (grouping === 'tag') {
            expenseOnly.forEach(item => {
                if (item.tags.length > 0) {
                    item.tags.forEach(tag => {
                        dataMap.set(tag.name, (dataMap.get(tag.name) || 0) + item.amount);
                    });
                } else {
                    dataMap.set('Untagged', (dataMap.get('Untagged') || 0) + item.amount);
                }
            });
        } else {
            expenseOnly.forEach(item => {
                if (item.account?.name) {
                    dataMap.set(item.account.name, (dataMap.get(item.account.name) || 0) + item.amount);
                }
            });
        }
        
        const allData = Array.from(dataMap, ([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
        const topN = 11;
        let chartData = allData;
        if (allData.length > topN) {
            const topData = allData.slice(0, topN);
            const otherValue = allData.slice(topN).reduce((sum, item) => sum + item.value, 0);
            chartData = [...topData, { name: 'Others', value: otherValue }];
        }

        const totalExpenses = expenseOnly.reduce((sum, item) => sum + item.amount, 0);
        return { chartData, allData, totalAmount: totalExpenses };
    };
    
    const { chartData: pieChartCategoryData, allData: allCategoryData } = useMemo(() => generatePieChartData('category'), [enrichedChartExpenses, categories]);
    const { chartData: pieChartAccountData, allData: allAccountData } = useMemo(() => generatePieChartData('account'), [enrichedChartExpenses, accounts]);
    const { chartData: pieChartTagData, allData: allTagData, totalAmount: totalTagExpenses } = useMemo(() => generatePieChartData('tag'), [enrichedChartExpenses, tags]);

    const useCategoryColors = userProfile?.dashboardSettings?.useCategoryColorsInChart ?? true;

    return (
        <div className="w-full space-y-8">
            <PageHeader description="Here's a summary of your financial activity." />
      
            <NewUserCheck />
            
            {accounts && accounts.length > 0 && (
                <>
                    <DashboardStats 
                        currentMonthExpenses={enrichedThisMonthExpenses} 
                        lastMonthExpenses={enrichedLastMonthExpenses}
                        isLoading={isLoading}
                        currency={userProfile?.defaultCurrency}
                    />

                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
                        <Card className={cn("lg:col-span-4", featuredCardClass)}>
                            <CardHeader>
                                <CardTitle className="font-headline">Expenses Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                                    <TabsList className={`grid w-full ${show5YearView ? 'grid-cols-4' : 'grid-cols-3'} mb-4 bg-muted/50`}>
                                        <TabsTrigger value="week">This Week</TabsTrigger>
                                        <TabsTrigger value="month">This Month</TabsTrigger>
                                        <TabsTrigger value="year">This Year</TabsTrigger>
                                        {show5YearView && <TabsTrigger value="5year">5 Years</TabsTrigger>}
                                    </TabsList>
                                    {isLoading ? (
                                        <Skeleton className="h-[350px] w-full rounded-xl" />
                                    ) : (
                                        <>
                                            <TabsContent value="week">
                                                <ExpensesBarChart expenses={enrichedChartExpenses} allCategories={categories || []} timeRange="week" currencySymbol={currencySymbol} useCategoryColors={useCategoryColors}/>
                                            </TabsContent>
                                            <TabsContent value="month">
                                                <ExpensesBarChart expenses={enrichedChartExpenses} allCategories={categories || []} timeRange="month" currencySymbol={currencySymbol} useCategoryColors={useCategoryColors}/>
                                            </TabsContent>
                                            <TabsContent value="year">
                                                <ExpensesBarChart expenses={enrichedChartExpenses} allCategories={categories || []} timeRange="year" currencySymbol={currencySymbol} useCategoryColors={useCategoryColors}/>
                                            </TabsContent>
                                            {show5YearView && (
                                                <TabsContent value="5year">
                                                    <ExpensesBarChart expenses={enrichedChartExpenses} allCategories={categories || []} timeRange="5year" currencySymbol={currencySymbol} useCategoryColors={useCategoryColors}/>
                                                </TabsContent>
                                            )}
                                        </>
                                    )}
                                </Tabs>
                            </CardContent>
                        </Card>
                        <Card className={cn("lg:col-span-3 h-auto", featuredCardClass)}>
                            <CardHeader>
                                <CardTitle className="font-headline">Spending Breakdown</CardTitle>
                                 <CardDescription>Breakdown of expenses for {timeRangeLabel}.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="category" value={pieChartGrouping} onValueChange={(value) => setPieChartGrouping(value as PieChartGrouping)}>
                                    <TabsList className="grid w-full grid-cols-3 mb-4 bg-muted/50">
                                        <TabsTrigger value="category">Category</TabsTrigger>
                                        <TabsTrigger value="account">Account</TabsTrigger>
                                        <TabsTrigger value="tag">Tag</TabsTrigger>
                                    </TabsList>
                                    {isLoading ? (
                                        <Skeleton className="h-[450px] w-full rounded-xl" />
                                    ) : (
                                        <>
                                            <TabsContent value="category">
                                                <CategoryPieChart data={pieChartCategoryData} allData={allCategoryData} currencySymbol={currencySymbol} />
                                            </TabsContent>
                                            <TabsContent value="account">
                                                <CategoryPieChart data={pieChartAccountData} allData={allCategoryData} currencySymbol={currencySymbol} />
                                            </TabsContent>
                                            <TabsContent value="tag">
                                                <CategoryPieChart data={pieChartTagData} allData={allTagData} currencySymbol={currencySymbol} totalAmountForPercentage={totalTagExpenses}/>
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
