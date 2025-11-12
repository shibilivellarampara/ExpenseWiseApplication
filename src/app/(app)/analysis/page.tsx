
'use client';

import { PageHeader } from "@/components/PageHeader";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { Expense, Category, EnrichedExpense, Account, Tag, UserProfile } from "@/lib/types";
import { collection, query, where, Timestamp, doc, orderBy } from 'firebase/firestore';
import { useMemo, useState, useTransition } from "react";
import { subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek, parse, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { analyzeExpenses } from "@/ai/flows/analyze-expenses";
import { CategoryAnalysisTable } from "@/components/analysis/CategoryAnalysisTable";
import { SpendingTrendChart } from "@/components/analysis/SpendingTrendChart";
import { AiInsights } from "@/components/analysis/AiInsights";
import { ExpensesSummary } from "@/components/expenses/ExpensesSummary";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type TimeRangePreset = 'week' | 'month' | 'last-month' | '3-months' | 'year' | 'all' | 'custom';
const SPECIAL_CATEGORIES = ['Credit Limit Upgrade', 'Credit Limit Downgrade', 'Credit Card Payment'];

export default function AnalysisPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>('month');
    const [isAiLoading, startAiTransition] = useTransition();
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [customDateRange, setCustomDateRange] = useState<{ from?: Date, to?: Date }>({ from: undefined, to: undefined });
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);


    const { dateRangeStart, dateRangeEnd } = useMemo(() => {
        const now = new Date();
        switch (timeRangePreset) {
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
            case 'all':
                return { dateRangeStart: undefined, dateRangeEnd: undefined };
            case 'custom':
                 return { 
                    dateRangeStart: customDateRange.from ? startOfDay(customDateRange.from) : undefined, 
                    dateRangeEnd: customDateRange.to ? endOfDay(customDateRange.to) : undefined
                };
            default:
                return { dateRangeStart: startOfMonth(now), dateRangeEnd: endOfDay(now) };
        }
    }, [timeRangePreset, customDateRange]);

    const expensesQuery = useMemoFirebase(() => {
        if (!user) return null;
        
        let q = query(collection(firestore, `users/${user.uid}/expenses`), orderBy('date', 'desc'));

        if (dateRangeStart) {
            q = query(q, where('date', '>=', Timestamp.fromDate(dateRangeStart)));
        }
        if (dateRangeEnd) {
            q = query(q, where('date', '<=', Timestamp.fromDate(dateRangeEnd)));
        }

        return q;
    }, [user, firestore, dateRangeStart, dateRangeEnd]);
    
    const categoriesQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/categories`) : null, [firestore, user]);
    const accountsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/accounts`) : null, [firestore, user]);
    const tagsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/tags`) : null, [firestore, user]);
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);

    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: allAccounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);
    const { data: tags, isLoading: tagsLoading } = useCollection<Tag>(tagsQuery);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const isLoading = expensesLoading || categoriesLoading || accountsLoading || tagsLoading;

    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(allAccounts?.map(a => [a.id, a])), [allAccounts]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);
    const excludedCategoryIds = useMemo(() => userProfile?.analysisSettings?.excludedCategoryIds || [], [userProfile]);

    const enrichedExpenses = useMemo((): EnrichedExpense[] => {
        if (!expenses || !categoryMap.size || !accountMap.size) return [];
        
        // Apply account filtering on the client side
        const filteredByAccount = selectedAccounts.length > 0 
            ? expenses.filter(e => selectedAccounts.includes(e.accountId))
            : expenses;

        return filteredByAccount.map(expense => {
            const date = expense.date instanceof Date ? expense.date : (expense.date as Timestamp).toDate();
            const category = expense.categoryId ? categoryMap.get(expense.categoryId) : undefined;
            // Exclude special financial management categories from analysis
            if (category && (SPECIAL_CATEGORIES.includes(category.name) || excludedCategoryIds.includes(category.id))) {
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
    }, [expenses, categoryMap, accountMap, tagMap, selectedAccounts, excludedCategoryIds]);
    

    const handleTimeRangeChange = (value: string) => {
        setTimeRangePreset(value as TimeRangePreset);
        setAiAnalysis(null); // Clear AI analysis when time range changes
    };

    const handleDateChange = (dateStr: string | undefined, field: 'from' | 'to') => {
        let date: Date | undefined = undefined;
        if(dateStr) {
            try {
                date = parse(dateStr, 'yyyy-MM-dd', new Date());
                if(isNaN(date.getTime())) date = undefined;
            } catch(e) {
                date = undefined;
            }
        }
        setCustomDateRange(prev => ({ ...prev, [field]: date }));
    }
    
    const handleAccountSelectChange = (accountId: string) => {
        setSelectedAccounts(prev => 
            prev.includes(accountId)
                ? prev.filter(id => id !== accountId)
                : [...prev, accountId]
        );
    }

    const formatDateForInput = (date: Date | undefined): string => {
        return date ? format(date, 'yyyy-MM-dd') : '';
    }

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
                 <div className="flex flex-col sm:flex-row gap-2 w-full max-w-lg">
                    <Select value={timeRangePreset} onValueChange={handleTimeRangeChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a time range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="last-month">Last Month</SelectItem>
                            <SelectItem value="3-months">Last 3 Months</SelectItem>
                            <SelectItem value="year">This Year</SelectItem>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>
                    
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                                <span>{selectedAccounts.length > 0 ? `${selectedAccounts.length} accounts selected` : "All Accounts"}</span>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                            <Command>
                                <CommandInput placeholder="Search accounts..." />
                                <CommandList>
                                    <CommandEmpty>No results found.</CommandEmpty>
                                    <CommandGroup>
                                        {(allAccounts || []).map(item => (
                                            <CommandItem
                                                key={item.id}
                                                onSelect={() => handleAccountSelectChange(item.id)}
                                                className="flex justify-between cursor-pointer"
                                            >
                                                {item.name}
                                                 <Check className={cn("h-4 w-4", selectedAccounts.includes(item.id) ? "opacity-100" : "opacity-0")} />
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </DropdownMenuContent>
                    </DropdownMenu>

                     {timeRangePreset === 'custom' && (
                        <div className="grid grid-cols-2 gap-2">
                           <div className="space-y-1">
                                <Label htmlFor="from-date" className="text-xs">From</Label>
                                <Input
                                    id="from-date"
                                    type="date"
                                    value={formatDateForInput(customDateRange?.from)}
                                    onChange={(e) => handleDateChange(e.target.value ?? undefined, 'from')}
                                    className="text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="to-date" className="text-xs">To</Label>
                                <Input
                                    id="to-date"
                                    type="date"
                                    value={formatDateForInput(customDateRange?.to)}
                                    onChange={(e) => handleDateChange(e.target.value ?? undefined, 'to')}
                                    className="text-sm"
                                />
                            </div>
                        </div>
                    )}
                </div>
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
                            {isLoading ? <Skeleton className="h-64 w-full" /> : <CategoryAnalysisTable expenses={enrichedExpenses} currency={userProfile?.defaultCurrency} />}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Income vs. Expense Trend</CardTitle>
                            <CardDescription>Your cash flow over the selected period.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-80 w-full" /> : <SpendingTrendChart expenses={enrichedExpenses} currency={userProfile?.defaultCurrency} timeRange={timeRangePreset} />}
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

    