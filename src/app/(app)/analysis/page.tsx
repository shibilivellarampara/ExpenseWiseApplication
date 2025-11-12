
'use client';

import { PageHeader } from "@/components/PageHeader";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { Expense, Category, EnrichedExpense, Account, Tag, UserProfile } from "@/lib/types";
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { useMemo, useState, useTransition } from "react";
import { subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { analyzeExpenses } from "@/ai/flows/analyze-expenses";
import { CategoryAnalysisTable } from "@/components/analysis/CategoryAnalysisTable";
import { SpendingTrendChart } from "@/components/analysis/SpendingTrendChart";
import { AiInsights } from "@/components/analysis/AiInsights";
import { ExpensesSummary } from "@/components/expenses/ExpensesSummary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TimeRange = 'week' | 'month' | 'last-month' | '3-months' | 'year';
const SPECIAL_CATEGORIES = ['Credit Limit Upgrade', 'Credit Limit Downgrade'];

export default function AnalysisPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [isAiLoading, startAiTransition] = useTransition();
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);

    const { dateRangeStart, dateRangeEnd } = useMemo(() => {
        const now = new Date();
        switch (timeRange) {
            case 'week':
                return { dateRangeStart: startOfWeek(now), dateRangeEnd: endOfWeek(now) };
            case 'month':
                return { dateRangeStart: startOfMonth(now), dateRangeEnd: endOfDay(now) };
            case 'last-month':
                const lastMonth = subMonths(now, 1);
                return { dateRangeStart: startOfMonth(lastMonth), dateRangeEnd: endOfMonth(lastMonth) };
            case '3-months':
                return { dateRangeStart: startOfDay(subMonths(now, 3)), dateRangeEnd: endOfDay(now) };
            case 'year':
                return { dateRangeStart: startOfYear(now), dateRangeEnd: endOfDay(now) };
            default:
                return { dateRangeStart: startOfMonth(now), dateRangeEnd: endOfDay(now) };
        }
    }, [timeRange]);

    const expensesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, `users/${user.uid}/expenses`),
            where('date', '>=', Timestamp.fromDate(dateRangeStart)),
            where('date', '<=', Timestamp.fromDate(dateRangeEnd))
        );
    }, [user, firestore, dateRangeStart, dateRangeEnd]);
    
    const categoriesQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/categories`) : null, [firestore, user]);
    const accountsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/accounts`) : null, [firestore, user]);
    const tagsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/tags`) : null, [firestore, user]);
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);

    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);
    const { data: tags, isLoading: tagsLoading } = useCollection<Tag>(tagsQuery);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const isLoading = expensesLoading || categoriesLoading || accountsLoading || tagsLoading;

    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(accounts?.map(a => [a.id, a])), [accounts]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);

    const enrichedExpenses = useMemo((): EnrichedExpense[] => {
        if (!expenses || !categoryMap.size || !accountMap.size) return [];
        return expenses.map(expense => {
            const date = expense.date instanceof Date ? expense.date : expense.date.toDate();
            const category = expense.categoryId ? categoryMap.get(expense.categoryId) : undefined;
            // Exclude special financial management categories from analysis
            if (category && SPECIAL_CATEGORIES.includes(category.name)) {
                return null;
            }
            return {
                ...expense,
                date,
                category,
                account: accountMap.get(expense.accountId),
                tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
            };
        }).filter((e): e is EnrichedExpense => e !== null);
    }, [expenses, categoryMap, accountMap, tagMap]);
    

    const handleTimeRangeChange = (value: string) => {
        setTimeRange(value as TimeRange);
        setAiAnalysis(null); // Clear AI analysis when time range changes
    };

    const handleGenerateInsights = () => {
        if (enrichedExpenses.length === 0) return;
        startAiTransition(async () => {
            const result = await analyzeExpenses({ 
                expenses: enrichedExpenses.map(e => ({
                    type: e.type,
                    amount: e.amount,
                    description: e.description,
                    date: e.date.toISOString(),
                    category: e.category?.name,
                    account: e.account?.name,
                    tags: e.tags.map(t => t.name),
                })) 
            });
            setAiAnalysis(result);
        });
    };

    return (
        <div className="w-full space-y-8">
            <PageHeader
                title="Expense Analysis"
                description="A detailed breakdown of your income and spending habits."
            >
                <Tabs value={timeRange} onValueChange={handleTimeRangeChange} className="w-full max-w-md">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="week">Week</TabsTrigger>
                        <TabsTrigger value="month">Month</TabsTrigger>
                        <TabsTrigger value="last-month">Last Month</TabsTrigger>
                        <TabsTrigger value="3-months">3 Months</TabsTrigger>
                        <TabsTrigger value="year">Year</TabsTrigger>
                    </TabsList>
                </Tabs>
            </PageHeader>
            
            <ExpensesSummary expenses={enrichedExpenses} isLoading={isLoading} currency={userProfile?.defaultCurrency} />

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5 mt-8">
                <div className="lg:col-span-3 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Spending by Category</CardTitle>
                            <CardDescription>A summary of your transactions broken down by category for the selected period.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-64 w-full" /> : <CategoryAnalysisTable expenses={enrichedExpenses} currency={userProfile?.defaultCurrency} dateRange={{ from: dateRangeStart, to: dateRangeEnd }} />}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Income vs. Expense Trend</CardTitle>
                            <CardDescription>Your cash flow over the selected period.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-80 w-full" /> : <SpendingTrendChart expenses={enrichedExpenses} currency={userProfile?.defaultCurrency} timeRange={timeRange} />}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle>AI-Powered Insights</CardTitle>
                            <CardDescription>Let AI analyze your spending and provide personalized advice.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AiInsights
                                onGenerate={handleGenerateInsights}
                                analysis={aiAnalysis}
                                isLoading={isAiLoading}
                                hasData={enrichedExpenses.length > 0}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
