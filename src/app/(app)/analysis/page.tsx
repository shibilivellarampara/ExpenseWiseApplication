
'use client';

import { PageHeader } from "@/components/PageHeader";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { Expense, Category, EnrichedExpense, Account, Tag, UserProfile } from "@/lib/types";
import { collection, query, where, Timestamp, doc, orderBy } from 'firebase/firestore';
import { useMemo, useState, useTransition, useEffect } from "react";
import { subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek, parse, format, subYears } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { analyzeExpenses } from "@/ai/flows/analyze-expenses";
import { CategoryAnalysisTable } from "@/components/analysis/CategoryAnalysisTable";
import { SpendingTrendChart } from "@/components/analysis/SpendingTrendChart";
import { AiInsights } from "@/components/analysis/AiInsights";
import { AnalysisSummary } from "@/components/analysis/AnalysisSummary";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronDown, Settings } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AnalysisSettingsContent } from "@/components/profile/AnalysisSettingsContent";
import { useSearchParams } from "next/navigation";
import { TagSpendingChart } from "@/components/analysis/TagSpendingChart";
import { IncomeBreakdownChart } from "@/components/analysis/IncomeBreakdownChart";
import { CategoryBarChart } from "@/components/analysis/CategoryBarChart";


type TimeRangePreset = 'week' | 'month' | 'last-month' | '3-months' | '6-months' | 'year' | 'last-year' | 'all' | 'custom';

export default function AnalysisPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const searchParams = useSearchParams();
    
    const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>('3-months');
    const [isAiLoading, startAiTransition] = useTransition();
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [customDateRange, setCustomDateRange] = useState<{ from?: Date, to?: Date }>({ from: undefined, to: undefined });
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    
    useEffect(() => {
        const accountId = searchParams.get('accounts');
        if (accountId) {
            setSelectedAccounts([accountId]);
        }
    }, [searchParams]);


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
            case '6-months':
                return { dateRangeStart: startOfDay(subMonths(now, 6)), dateRangeEnd: endOfDay(now) };
            case 'year':
                return { dateRangeStart: startOfYear(now), dateRangeEnd: endOfDay(now) };
            case 'last-year':
                const lastYear = subYears(now, 1);
                return { dateRangeStart: startOfYear(lastYear), dateRangeEnd: endOfYear(lastYear) };
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

    const { data: allExpenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: allAccounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);
    const { data: tags, isLoading: tagsLoading } = useCollection<Tag>(tagsQuery);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const isLoading = expensesLoading || categoriesLoading || accountsLoading || tagsLoading;

    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(allAccounts?.map(a => [a.id, a])), [allAccounts]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);
    
    const analysisSettings = userProfile?.analysisSettings;

    const allEnrichedExpenses = useMemo((): EnrichedExpense[] => {
        if (!allExpenses || !categoryMap.size || !accountMap.size) return [];
        return allExpenses
            .filter(expense => {
                if (selectedAccounts.length > 0 && !selectedAccounts.includes(expense.accountId)) {
                    return false;
                }
                return true;
            })
            .map(expense => ({
                ...expense,
                date: expense.date instanceof Date ? expense.date : (expense.date as Timestamp).toDate(),
                category: expense.categoryId ? categoryMap.get(expense.categoryId) : undefined,
                account: accountMap.get(expense.accountId),
                tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
            }));
    }, [allExpenses, categoryMap, accountMap, tagMap, selectedAccounts]);

    const expensesForAnalysis = useMemo((): EnrichedExpense[] => {
        const excludedCategoryIds = analysisSettings?.excludedCategoryIds || [];
        if (excludedCategoryIds.length === 0) {
            return allEnrichedExpenses;
        }
        return allEnrichedExpenses.filter(expense => {
            return !expense.category || !excludedCategoryIds.includes(expense.category.id);
        });
    }, [allEnrichedExpenses, analysisSettings]);
    

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
        if (expensesForAnalysis.length === 0) return;
        startAiTransition(async () => {
            try {
                const result = await analyzeExpenses({ 
                    expenses: expensesForAnalysis.map(e => ({
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
            } catch (error) {
                console.error("AI analysis failed:", error);
                setAiAnalysis({
                    summary: "Sorry, I couldn't generate insights right now. The AI service may be temporarily unavailable.",
                    topCategories: [],
                    savingsSuggestions: []
                });
            }
        });
    };

    return (
        <div className="w-full space-y-8">
            <PageHeader
                title="Expense Analysis"
                description="A detailed breakdown of your income and spending habits."
            >
                 <div className="flex items-center gap-2">
                    <Select value={timeRangePreset} onValueChange={handleTimeRangeChange}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Select a time range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="last-month">Last Month</SelectItem>
                            <SelectItem value="3-months">Last 3 Months</SelectItem>
                            <SelectItem value="6-months">Last 6 Months</SelectItem>
                            <SelectItem value="year">This Year</SelectItem>
                            <SelectItem value="last-year">Last Year</SelectItem>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>
                    
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-[180px] justify-between">
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
                    
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Analysis Settings</DialogTitle>
                                <DialogDescription>
                                    Customize your analysis page settings.
                                </DialogDescription>
                            </DialogHeader>
                            <AnalysisSettingsContent />
                        </DialogContent>
                    </Dialog>
                </div>
            </PageHeader>
            
            {timeRangePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2 max-w-sm">
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
            
            <AnalysisSummary 
                allExpenses={allEnrichedExpenses}
                analysisExpenses={expensesForAnalysis}
                isLoading={isLoading}
                currency={userProfile?.defaultCurrency}
                showNormal={analysisSettings?.showNormalTotal ?? true}
                showAdjusted={analysisSettings?.showAdjustedTotal ?? true}
            />


            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5 mt-8">
                <div className="lg:col-span-3 space-y-8">
                    {(analysisSettings?.showCategoryTable ?? true) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Spending by Category</CardTitle>
                                <CardDescription>A summary of your transactions broken down by category for the selected period.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? <Skeleton className="h-64 w-full" /> : <CategoryAnalysisTable expenses={expensesForAnalysis} currency={userProfile?.defaultCurrency} />}
                            </CardContent>
                        </Card>
                    )}
                    {(analysisSettings?.showTrendChart ?? true) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Income vs. Expense Trend</CardTitle>
                                <CardDescription>Your cash flow over the selected period.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? <Skeleton className="h-80 w-full" /> : <SpendingTrendChart expenses={expensesForAnalysis} currency={userProfile?.defaultCurrency} timeRange={timeRangePreset} />}
                            </CardContent>
                        </Card>
                    )}
                     {(analysisSettings?.showCategoryBarChart ?? true) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Spending Categories</CardTitle>
                                <CardDescription>A bar chart showing your top spending categories.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? <Skeleton className="h-80 w-full" /> : <CategoryBarChart expenses={expensesForAnalysis} currency={userProfile?.defaultCurrency} />}
                            </CardContent>
                        </Card>
                    )}
                     <div className="grid gap-8 md:grid-cols-2">
                        {(analysisSettings?.showTagPieChart ?? true) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Spending by Tag</CardTitle>
                                    <CardDescription>A breakdown of your expenses by tags.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? <Skeleton className="h-80 w-full" /> : <TagSpendingChart expenses={expensesForAnalysis} currency={userProfile?.defaultCurrency} />}
                                </CardContent>
                            </Card>
                        )}
                        {(analysisSettings?.showIncomePieChart ?? true) && (
                            <Card>
                                 <CardHeader>
                                    <CardTitle>Income Sources</CardTitle>
                                    <CardDescription>A breakdown of your income by category.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? <Skeleton className="h-80 w-full" /> : <IncomeBreakdownChart expenses={expensesForAnalysis} currency={userProfile?.defaultCurrency} />}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
                {(analysisSettings?.showAiInsights ?? true) && (
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
                                    hasData={expensesForAnalysis.length > 0}
                                />
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
