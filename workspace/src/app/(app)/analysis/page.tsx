'use client';

import { PageHeader } from "@/components/PageHeader";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { Expense, Category, EnrichedExpense, Account, Tag, UserProfile } from "@/lib/types";
import { collection, query, where, Timestamp, doc, orderBy } from 'firebase/firestore';
import { useMemo, useState, useTransition, useEffect, Suspense } from "react";
import { subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek, parse, format, subYears, isValid } from "date-fns";
import { CategoryAnalysisTable } from "@/components/analysis/CategoryAnalysisTable";
import { SpendingTrendChart } from "@/components/analysis/SpendingTrendChart";
import { AiInsights } from "@/components/analysis/AiInsights";
import { AnalysisSummary } from "@/components/analysis/AnalysisSummary";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { analyzeExpenses } from "@/ai/flows/analyze-expenses";
import { SavingsTrendChart } from "@/components/analysis/SavingsTrendChart";
import { CategoryBarChart } from "@/components/analysis/CategoryBarChart";
import { TagSpendingChart } from "@/components/analysis/TagSpendingChart";
import { IncomeBreakdownChart } from "@/components/analysis/IncomeBreakdownChart";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type TimeRangePreset = 'week' | 'month' | 'last-month' | '3-months' | '6-months' | 'year' | 'last-year' | 'all' | 'specific-month' | 'custom';
type StoredFilters = {
    timeRangePreset: TimeRangePreset;
    customDateRange: { from?: string; to?: string };
    specificMonth?: string;
    selectedAccounts: string[];
    selectedTags: string[];
};

function AnalysisPageContent() {
    const { user } = useUser();
    const firestore = useFirestore();
    const searchParams = useSearchParams();
    const FILTERS_STORAGE_KEY = `analysis_filters_${user?.uid}`;

    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>('3-months');
    const [isAiLoading, startAiTransition] = useTransition();
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [customDateRange, setCustomDateRange] = useState<{ from?: Date, to?: Date }>({ from: undefined, to: undefined });
    const [specificMonth, setSpecificMonth] = useState<Date>(new Date());
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [includeHidden, setIncludeHidden] = useState(false);
    
    useEffect(() => {
        if (user) {
            const storedFiltersRaw = localStorage.getItem(FILTERS_STORAGE_KEY);
            if (storedFiltersRaw) {
                try {
                    const storedFilters: StoredFilters = JSON.parse(storedFiltersRaw);
                    if (storedFilters.timeRangePreset) setTimeRangePreset(storedFilters.timeRangePreset);
                    if (storedFilters.customDateRange) {
                        setCustomDateRange({
                            from: storedFilters.customDateRange.from ? parse(storedFilters.customDateRange.from, 'yyyy-MM-dd', new Date()) : undefined,
                            to: storedFilters.customDateRange.to ? parse(storedFilters.customDateRange.to, 'yyyy-MM-dd', new Date()) : undefined,
                        });
                    }
                    if (storedFilters.specificMonth) setSpecificMonth(parse(storedFilters.specificMonth, 'yyyy-MM', new Date()));
                    const accountIdFromUrl = searchParams.get('accounts');
                    if (accountIdFromUrl) setSelectedAccounts([accountIdFromUrl]);
                    else if (storedFilters.selectedAccounts) setSelectedAccounts(storedFilters.selectedAccounts);
                    if (storedFilters.selectedTags) setSelectedTags(storedFilters.selectedTags);
                } catch (e) {
                    localStorage.removeItem(FILTERS_STORAGE_KEY);
                }
            }
            setIsInitialLoad(false);
        }
    }, [user, searchParams, FILTERS_STORAGE_KEY]);

    useEffect(() => {
        if (user && !isInitialLoad) {
            const filtersToStore: StoredFilters = {
                timeRangePreset,
                customDateRange: {
                    from: customDateRange.from ? format(customDateRange.from, 'yyyy-MM-dd') : undefined,
                    to: customDateRange.to ? format(customDateRange.to, 'yyyy-MM-dd') : undefined,
                },
                specificMonth: format(specificMonth, 'yyyy-MM'),
                selectedAccounts,
                selectedTags,
            };
            localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filtersToStore));
        }
    }, [timeRangePreset, customDateRange, selectedAccounts, selectedTags, specificMonth, user, isInitialLoad, FILTERS_STORAGE_KEY]);

    const { dateRangeStart, dateRangeEnd } = useMemo(() => {
        const now = new Date();
        switch (timeRangePreset) {
            case 'week': return { dateRangeStart: startOfWeek(now), dateRangeEnd: endOfWeek(now) };
            case 'month': return { dateRangeStart: startOfMonth(now), dateRangeEnd: endOfDay(now) };
            case 'last-month':
                const lastMonth = subMonths(now, 1);
                return { dateRangeStart: startOfMonth(lastMonth), dateRangeEnd: endOfMonth(lastMonth) };
            case '3-months': return { dateRangeStart: startOfDay(subMonths(now, 3)), dateRangeEnd: endOfDay(now) };
            case '6-months': return { dateRangeStart: startOfDay(subMonths(now, 6)), dateRangeEnd: endOfDay(now) };
            case 'year': return { dateRangeStart: startOfYear(now), dateRangeEnd: endOfDay(now) };
            case 'last-year':
                const lastYear = subYears(now, 1);
                return { dateRangeStart: startOfYear(lastYear), dateRangeEnd: endOfYear(lastYear) };
            case 'specific-month':
                return { dateRangeStart: startOfMonth(specificMonth), dateRangeEnd: endOfMonth(specificMonth) };
            case 'all': return { dateRangeStart: undefined, dateRangeEnd: undefined };
            case 'custom':
                 const from = customDateRange.from && isValid(customDateRange.from) ? startOfDay(customDateRange.from) : undefined;
                 const to = customDateRange.to && isValid(customDateRange.to) ? endOfDay(customDateRange.to) : undefined;
                 return { dateRangeStart: from, dateRangeEnd: to };
            default: return { dateRangeStart: startOfDay(subMonths(now, 3)), dateRangeEnd: endOfDay(now) };
        }
    }, [timeRangePreset, customDateRange, specificMonth]);

    const expensesQuery = useMemoFirebase(() => {
        if (!user) return null;
        let q = query(collection(firestore, `users/${user.uid}/expenses`), orderBy('date', 'desc'));
        if (dateRangeStart) q = query(q, where('date', '>=', Timestamp.fromDate(dateRangeStart)));
        if (dateRangeEnd) q = query(q, where('date', '<=', Timestamp.fromDate(dateRangeEnd)));
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
                if (selectedAccounts.length > 0 && expense.accountId && !selectedAccounts.includes(expense.accountId)) return false;
                if (selectedTags.length > 0) {
                    if (!expense.tagIds || expense.tagIds.length === 0) return false;
                    return expense.tagIds.some(tagId => selectedTags.includes(tagId));
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

    const filteredExpenses = useMemo((): EnrichedExpense[] => {
        const excludedCategoryIds = analysisSettings?.excludedCategoryIds || [];
        if (includeHidden || excludedCategoryIds.length === 0) return allEnrichedExpenses;
        return allEnrichedExpenses.filter(expense => !expense.category || !excludedCategoryIds.includes(expense.category.id));
    }, [allEnrichedExpenses, analysisSettings, includeHidden]);

    const handleTimeRangeChange = (value: string) => {
        setTimeRangePreset(value as TimeRangePreset);
    };

    const timeRangeLabels: Record<TimeRangePreset, string> = {
        'week': 'This Week',
        'month': 'This Month',
        'last-month': 'Last Month',
        '3-months': 'Last 3 Months',
        '6-months': 'Last 6 Months',
        'year': 'This Year',
        'last-year': 'Last Year',
        'all': 'All Time',
        'specific-month': format(specificMonth, 'MMM yy'),
        'custom': 'Custom...'
    };

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear; i >= currentYear - 10; i--) {
            years.push(i);
        }
        return years;
    }, []);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className="w-full space-y-6 pb-32">
            <Suspense fallback={null}>
                <PageHeader
                    title="Analysis"
                />

                <AnalysisSummary 
                    expenses={filteredExpenses}
                    isLoading={isLoading}
                    currency={userProfile?.defaultCurrency}
                    includeHidden={includeHidden}
                    onIncludeHiddenChange={setIncludeHidden}
                    categories={categories || []}
                    excludedCategoryIds={analysisSettings?.excludedCategoryIds || []}
                />

                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 rounded-full px-4 border-muted-foreground/20 text-xs font-medium bg-card shadow-sm shrink-0">
                                {timeRangeLabels[timeRangePreset]}
                                <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="start">
                            <Command>
                                <CommandList>
                                    <CommandGroup>
                                        <CommandItem onSelect={() => handleTimeRangeChange('week')}>This Week</CommandItem>
                                        <CommandItem onSelect={() => handleTimeRangeChange('month')}>This Month</CommandItem>
                                        <CommandItem onSelect={() => handleTimeRangeChange('last-month')}>Last Month</CommandItem>
                                        <CommandItem onSelect={() => handleTimeRangeChange('3-months')}>Last 3 Months</CommandItem>
                                        <CommandItem onSelect={() => handleTimeRangeChange('6-months')}>Last 6 Months</CommandItem>
                                        <CommandItem onSelect={() => handleTimeRangeChange('year')}>This Year</CommandItem>
                                        <CommandItem onSelect={() => handleTimeRangeChange('last-year')}>Last Year</CommandItem>
                                        <CommandItem onSelect={() => { handleTimeRangeChange('specific-month'); setIsMonthPickerOpen(true); }}>Specific Month...</CommandItem>
                                        <CommandItem onSelect={() => handleTimeRangeChange('all')}>All Time</CommandItem>
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 rounded-full px-4 border-muted-foreground/20 text-xs font-medium bg-card shadow-sm shrink-0">
                                {selectedAccounts.length === 0 
                                    ? "All Accounts" 
                                    : selectedAccounts.length === 1 
                                        ? "1 Account" 
                                        : `${selectedAccounts.length} Accounts`}
                                <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="start">
                            <Command>
                                <CommandInput placeholder="Search accounts..." />
                                <CommandList>
                                    <CommandEmpty>No results found.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem onSelect={() => setSelectedAccounts([])} className="flex justify-between">
                                            All Accounts <Check className={cn("h-4 w-4", selectedAccounts.length === 0 ? "opacity-100" : "opacity-0")} />
                                        </CommandItem>
                                        {allAccounts?.map(acc => (
                                            <CommandItem key={acc.id} onSelect={() => setSelectedAccounts(prev => prev.includes(acc.id) ? prev.filter(id => id !== acc.id) : [...prev, acc.id])} className="flex justify-between">
                                                {acc.name} <Check className={cn("h-4 w-4", selectedAccounts.includes(acc.id) ? "opacity-100" : "opacity-0")} />
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 rounded-full px-4 border-muted-foreground/20 text-xs font-medium bg-card shadow-sm shrink-0">
                                {selectedTags.length === 0 
                                    ? "All Tags" 
                                    : selectedTags.length === 1 
                                        ? "1 Tag" 
                                        : `${selectedTags.length} Tags`}
                                <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="start">
                            <Command>
                                <CommandInput placeholder="Search tags..." />
                                <CommandList>
                                    <CommandEmpty>No results found.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem onSelect={() => setSelectedTags([])} className="flex justify-between">
                                            All Tags <Check className={cn("h-4 w-4", selectedTags.length === 0 ? "opacity-100" : "opacity-0")} />
                                        </CommandItem>
                                        {tags?.map(tag => (
                                            <CommandItem key={tag.id} onSelect={() => setSelectedTags(prev => prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id])} className="flex justify-between">
                                                {tag.name} <Check className={cn("h-4 w-4", selectedTags.includes(tag.id) ? "opacity-100" : "opacity-0")} />
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="space-y-6">
                    {(analysisSettings?.showCategoryTable ?? true) && (
                        <CategoryAnalysisTable 
                            expenses={filteredExpenses} 
                            currency={userProfile?.defaultCurrency} 
                            excludedCategoryIds={analysisSettings?.excludedCategoryIds}
                        />
                    )}

                    {(analysisSettings?.showSavingsTrendChart ?? true) && (
                        <Card className="rounded-[20px] shadow-md border-none overflow-hidden bg-card">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg">Monthly Savings Trend</h3>
                                        <p className="text-xs text-muted-foreground">Your net savings each month.</p>
                                    </div>
                                    <ChevronDown className="h-5 w-5 text-muted-foreground/50" />
                                </div>
                                <SavingsTrendChart expenses={filteredExpenses} currency={userProfile?.defaultCurrency} />
                            </CardContent>
                        </Card>
                    )}

                    {(analysisSettings?.showCategoryBarChart ?? true) && (
                        <Card className="rounded-[20px] shadow-md border-none overflow-hidden bg-card">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg">Top Spending Categories</h3>
                                        <p className="text-xs text-muted-foreground">A bar chart showing your top categories.</p>
                                    </div>
                                    <ChevronDown className="h-5 w-5 text-muted-foreground/50" />
                                </div>
                                <CategoryBarChart expenses={filteredExpenses} currency={userProfile?.defaultCurrency} />
                            </CardContent>
                        </Card>
                    )}

                    {(analysisSettings?.showTagPieChart ?? true) && (
                        <Card className="rounded-[20px] shadow-md border-none overflow-hidden bg-card">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg">Spending by Tag</h3>
                                        <p className="text-xs text-muted-foreground">A breakdown of your expenses by tags.</p>
                                    </div>
                                    <ChevronDown className="h-5 w-5 text-muted-foreground/50" />
                                </div>
                                <TagSpendingChart expenses={filteredExpenses} currency={userProfile?.defaultCurrency} />
                            </CardContent>
                        </Card>
                    )}

                    {(analysisSettings?.showIncomePieChart ?? true) && (
                        <Card className="rounded-[20px] shadow-md border-none overflow-hidden bg-card">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg">Income Sources</h3>
                                        <p className="text-xs text-muted-foreground">A breakdown of your income by category.</p>
                                    </div>
                                    <ChevronDown className="h-5 w-5 text-muted-foreground/50" />
                                </div>
                                <IncomeBreakdownChart expenses={filteredExpenses} currency={userProfile?.defaultCurrency} />
                            </CardContent>
                        </Card>
                    )}

                    {(analysisSettings?.showTrendChart ?? true) && (
                        <Card className="rounded-[20px] shadow-md border-none overflow-hidden bg-card">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg">Cash Flow Trend</h3>
                                        <p className="text-xs text-muted-foreground">Monthly cash flow analysis.</p>
                                    </div>
                                    <ChevronDown className="h-5 w-5 text-muted-foreground/50" />
                                </div>
                                <SpendingTrendChart expenses={filteredExpenses} currency={userProfile?.defaultCurrency} timeRange={timeRangePreset} />
                            </CardContent>
                        </Card>
                    )}

                    {(analysisSettings?.showAiInsights ?? true) && (
                        <Card className="rounded-[20px] shadow-md border-none overflow-hidden bg-card">
                            <CardContent className="p-6">
                                <AiInsights
                                    onGenerate={()=>{}}
                                    analysis={null}
                                    isLoading={false}
                                    hasData={filteredExpenses.length > 0}
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>

                <Dialog open={isMonthPickerOpen} onOpenChange={setIsMonthPickerOpen}>
                    <DialogContent className="rounded-[24px]">
                        <DialogHeader>
                            <DialogTitle>Select Month</DialogTitle>
                            <DialogDescription>Choose a month and year for analysis.</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Year</Label>
                                <Select value={String(specificMonth.getFullYear())} onValueChange={(v) => setSpecificMonth(new Date(Number(v), specificMonth.getMonth()))}>
                                    <SelectTrigger className="rounded-xl h-12">
                                        <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Month</Label>
                                <Select value={String(specificMonth.getMonth())} onValueChange={(v) => setSpecificMonth(new Date(specificMonth.getFullYear(), Number(v)))}>
                                    <SelectTrigger className="rounded-xl h-12">
                                        <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setIsMonthPickerOpen(false)} className="rounded-xl h-12 w-full">
                                Apply Filter
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </Suspense>
        </div>
    );
}

export default function AnalysisPage() {
    return (
        <Suspense fallback={null}>
            <AnalysisPageContent />
        </Suspense>
    );
}
