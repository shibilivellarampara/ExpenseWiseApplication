
'use client';

import { PageHeader } from "@/components/PageHeader";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { Expense, Category, EnrichedExpense, Account, Tag, UserProfile } from "@/lib/types";
import { collection, query, where, Timestamp, doc, orderBy } from 'firebase/firestore';
import { useMemo, useState, useTransition, useEffect } from "react";
import { subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek, parse, format, subYears, isValid } from "date-fns";
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
import { Check, ChevronDown, Settings, X, XCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AnalysisSettingsContent } from "@/components/profile/AnalysisSettingsContent";
import { useSearchParams } from "next/navigation";
import { TagSpendingChart } from "@/components/analysis/TagSpendingChart";
import { IncomeBreakdownChart } from "@/components/analysis/IncomeBreakdownChart";
import { CategoryBarChart } from "@/components/analysis/CategoryBarChart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";


type TimeRangePreset = 'week' | 'month' | 'last-month' | '3-months' | '6-months' | 'year' | 'last-year' | 'all' | 'custom';
type StoredFilters = {
    timeRangePreset: TimeRangePreset;
    customDateRange: { from?: string; to?: string };
    selectedAccounts: string[];
    selectedTags: string[];
};

function AnalysisPageSkeleton() {
    return (
        <div className="space-y-8">
            <AnalysisSummary isLoading={true} allExpenses={[]} analysisExpenses={[]} showNormal={true} showAdjusted={true}/>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
            <div className="grid gap-8 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-80 w-full" />
                    </CardContent>
                </Card>
                <Card>
                     <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-80 w-full" />
                    </CardContent>
                </Card>
            </div>
             <div className="grid gap-8 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-96 w-full" />
                    </CardContent>
                </Card>
                <Card>
                     <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-96 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}


export default function AnalysisPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const searchParams = useSearchParams();
    const FILTERS_STORAGE_KEY = `analysis_filters_${user?.uid}`;

    const [isInitialLoad, setIsInitialLoad] = useState(true);
    
    const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>('3-months');
    const [isAiLoading, startAiTransition] = useTransition();
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [customDateRange, setCustomDateRange] = useState<{ from?: Date, to?: Date }>({ from: undefined, to: undefined });
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    
    // Load filters from localStorage on initial render
    useEffect(() => {
        if (user) {
            const storedFiltersRaw = localStorage.getItem(FILTERS_STORAGE_KEY);
            if (storedFiltersRaw) {
                try {
                    const storedFilters: StoredFilters = JSON.parse(storedFiltersRaw);
                    if (storedFilters.timeRangePreset) {
                        setTimeRangePreset(storedFilters.timeRangePreset);
                    }
                    if (storedFilters.customDateRange) {
                        setCustomDateRange({
                            from: storedFilters.customDateRange.from ? parse(storedFilters.customDateRange.from, 'yyyy-MM-dd', new Date()) : undefined,
                            to: storedFilters.customDateRange.to ? parse(storedFilters.customDateRange.to, 'yyyy-MM-dd', new Date()) : undefined,
                        });
                    }
                    // URL params take precedence over stored accounts
                    const accountIdFromUrl = searchParams.get('accounts');
                    if (accountIdFromUrl) {
                        setSelectedAccounts([accountIdFromUrl]);
                    } else if (storedFilters.selectedAccounts) {
                        setSelectedAccounts(storedFilters.selectedAccounts);
                    }
                    
                    if (storedFilters.selectedTags) {
                        setSelectedTags(storedFilters.selectedTags);
                    }

                } catch (e) {
                    console.error("Failed to parse stored filters", e);
                    localStorage.removeItem(FILTERS_STORAGE_KEY);
                }
            } else {
                 // Check URL params even if no stored filters
                const accountIdFromUrl = searchParams.get('accounts');
                if (accountIdFromUrl) {
                    setSelectedAccounts([accountIdFromUrl]);
                }
            }
            setIsInitialLoad(false);
        }
    }, [user, searchParams, FILTERS_STORAGE_KEY]);


    // Save filters to localStorage whenever they change
    useEffect(() => {
        if (user && !isInitialLoad) {
            const filtersToStore: StoredFilters = {
                timeRangePreset,
                customDateRange: {
                    from: customDateRange.from ? format(customDateRange.from, 'yyyy-MM-dd') : undefined,
                    to: customDateRange.to ? format(customDateRange.to, 'yyyy-MM-dd') : undefined,
                },
                selectedAccounts,
                selectedTags,
            };
            localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filtersToStore));
        }
    }, [timeRangePreset, customDateRange, selectedAccounts, selectedTags, user, isInitialLoad, FILTERS_STORAGE_KEY]);


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
                 const from = customDateRange.from && isValid(customDateRange.from) ? startOfDay(customDateRange.from) : undefined;
                 const to = customDateRange.to && isValid(customDateRange.to) ? endOfDay(customDateRange.to) : undefined;
                 return { 
                    dateRangeStart: from, 
                    dateRangeEnd: to
                };
            default:
                return { dateRangeStart: startOfDay(subMonths(now, 3)), dateRangeEnd: endOfDay(now) };
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
    const tagsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/tags`), orderBy('name', 'asc')) : null, [firestore, user]);
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);

    const { data: allExpenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: allAccounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);
    const { data: tags, isLoading: tagsLoading } = useCollection<Tag>(tagsQuery);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const isLoading = expensesLoading || categoriesLoading || accountsLoading || tagsLoading || isInitialLoad;

    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(allAccounts?.map(a => [a.id, a])), [allAccounts]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);
    
    const analysisSettings = userProfile?.analysisSettings;

    const allEnrichedExpenses = useMemo((): EnrichedExpense[] => {
        if (!allExpenses || !categoryMap.size || !accountMap.size) return [];
        return allExpenses
            .filter(expense => {
                if (selectedAccounts.length > 0 && expense.accountId && !selectedAccounts.includes(expense.accountId)) {
                    return false;
                }
                if (selectedTags.length > 0) {
                    if (!expense.tagIds || expense.tagIds.length === 0) return false;
                    const hasMatchingTag = expense.tagIds.some(tagId => selectedTags.includes(tagId));
                    if (!hasMatchingTag) return false;
                }
                return true;
            })
            .map(expense => ({
                ...expense,
                date: expense.date instanceof Date ? expense.date : (expense.date as Timestamp).toDate(),
                category: expense.categoryId ? categoryMap.get(expense.categoryId) : undefined,
                account: expense.accountId ? accountMap.get(expense.accountId) : undefined,
                tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
            }));
    }, [allExpenses, categoryMap, accountMap, tagMap, selectedAccounts, selectedTags]);

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
        if (accountId === 'all') {
            setSelectedAccounts([]);
            return;
        }
        setSelectedAccounts(prev => 
            prev.includes(accountId)
                ? prev.filter(id => id !== accountId)
                : [...prev, accountId]
        );
    }
    
    const handleTagSelectChange = (tagId: string) => {
        if (tagId === 'clear') {
            setSelectedTags([]);
            return;
        }
        setSelectedTags(prev => 
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    }

    const formatDateForInput = (date: Date | undefined): string => {
        if (!date || !isValid(date)) return '';
        return format(date, 'yyyy-MM-dd');
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
                 <div className="flex items-center gap-2 flex-nowrap justify-end">
                    <Select value={timeRangePreset} onValueChange={handleTimeRangeChange}>
                        <SelectTrigger className="w-full sm:w-auto">
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
                            <Button variant="outline" className="w-full sm:w-auto justify-between">
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
                                         <CommandItem
                                            onSelect={() => handleAccountSelectChange('all')}
                                            className="flex justify-between cursor-pointer"
                                        >
                                            All Accounts
                                            <Check className={cn("h-4 w-4", selectedAccounts.length === 0 ? "opacity-100" : "opacity-0")} />
                                        </CommandItem>
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

                     <div className="flex items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-auto justify-between">
                                    <span>{selectedTags.length > 0 ? `${selectedTags.length} tags selected` : "All Tags"}</span>
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                                <Command>
                                    <CommandInput placeholder="Search tags..." />
                                    <CommandList>
                                        <CommandEmpty>No results found.</CommandEmpty>
                                        <CommandGroup>
                                            {(tags || []).map(item => (
                                                <CommandItem
                                                    key={item.id}
                                                    onSelect={() => handleTagSelectChange(item.id)}
                                                    className="flex justify-between cursor-pointer"
                                                >
                                                    {item.name}
                                                        <Check className={cn("h-4 w-4", selectedTags.includes(item.id) ? "opacity-100" : "opacity-0")} />
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </DropdownMenuContent>
                        </DropdownMenu>
                         {selectedTags.length > 0 && (
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => setSelectedTags([])}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
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
            
            {isLoading ? <AnalysisPageSkeleton /> : (
                <>
                    <AnalysisSummary 
                        allExpenses={allEnrichedExpenses}
                        analysisExpenses={expensesForAnalysis}
                        isLoading={isLoading}
                        currency={userProfile?.defaultCurrency}
                        showNormal={analysisSettings?.showNormalTotal ?? true}
                        showAdjusted={analysisSettings?.showAdjustedTotal ?? true}
                    />


                    <div className="space-y-8 mt-8">
                        {(analysisSettings?.showCategoryTable ?? true) && (
                            <Collapsible defaultOpen>
                                <Card>
                                    <CollapsibleTrigger asChild>
                                        <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
                                            <div className="space-y-1">
                                                <CardTitle>Spending by Category</CardTitle>
                                                <CardDescription>A summary of your transactions broken down by category for the selected period.</CardDescription>
                                            </div>
                                            <ChevronDown className="h-5 w-5 transition-transform [&[data-state=open]]:-rotate-180" />
                                        </CardHeader>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <CardContent>
                                            <CategoryAnalysisTable expenses={expensesForAnalysis} currency={userProfile?.defaultCurrency} />
                                        </CardContent>
                                    </CollapsibleContent>
                                </Card>
                            </Collapsible>
                        )}
                        
                        <div className="grid gap-8 md:grid-cols-2">
                            {(analysisSettings?.showTrendChart ?? true) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Income vs. Expense Trend</CardTitle>
                                        <CardDescription>Your cash flow over the selected period.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <SpendingTrendChart expenses={expensesForAnalysis} currency={userProfile?.defaultCurrency} timeRange={timeRangePreset} />
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
                                        <CategoryBarChart expenses={expensesForAnalysis} currency={userProfile?.defaultCurrency} />
                                    </CardContent>
                                </Card>
                            )}
                            {(analysisSettings?.showTagPieChart ?? true) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Spending by Tag</CardTitle>
                                        <CardDescription>A breakdown of your expenses by tags.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <TagSpendingChart expenses={expensesForAnalysis} currency={userProfile?.defaultCurrency} />
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
                                        <IncomeBreakdownChart expenses={expensesForAnalysis} currency={userProfile?.defaultCurrency} />
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                        
                        {(analysisSettings?.showAiInsights ?? true) && (
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
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
