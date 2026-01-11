

'use client';

import { PageHeader } from "@/components/PageHeader";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { Expense, Category, EnrichedExpense, Account, Tag, UserProfile } from "@/lib/types";
import { collection, query, where, Timestamp, doc, orderBy } from 'firebase/firestore';
import { useMemo, useState, useTransition, useEffect } from "react";
import { subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek, parse, format, subYears, isValid, getYear } from "date-fns";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AnalysisSettingsContent } from "@/components/profile/AnalysisSettingsContent";
import { useSearchParams } from "next/navigation";
import { TagSpendingChart } from "@/components/analysis/TagSpendingChart";
import { IncomeBreakdownChart } from "@/components/analysis/IncomeBreakdownChart";
import { CategoryBarChart } from "@/components/analysis/CategoryBarChart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SavingsTrendChart } from "@/components/analysis/SavingsTrendChart";


type TimeRangePreset = 'week' | 'month' | 'last-month' | '3-months' | '6-months' | 'year' | 'last-year' | 'all' | 'specific-month' | 'custom';
type StoredFilters = {
    timeRangePreset: TimeRangePreset;
    customDateRange: { from?: string; to?: string };
    specificMonth?: string;
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
    const [specificMonth, setSpecificMonth] = useState<Date>(new Date());
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [monthPopoverOpen, setMonthPopoverOpen] = useState(false);
    
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
                    if (storedFilters.specificMonth) {
                        setSpecificMonth(parse(storedFilters.specificMonth, 'yyyy-MM', new Date()));
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

        if (dateRangeStart) {
            q = query(q, where('date', '>=', Timestamp.fromDate(dateRangeStart)));
        }
        if (dateRangeEnd) {
            q = query(q, where('date', '<=', Timestamp.fromDate(dateRangeEnd)));
        }

        return q;
    }, [user, firestore, dateRangeStart, dateRangeEnd]);
    
    const allTimeExpensesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/expenses`)) : null, [user, firestore]);
    
    const categoriesQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/categories`) : null, [firestore, user]);
    const accountsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/accounts`) : null, [firestore, user]);
    const tagsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/tags`), orderBy('name', 'asc')) : null, [firestore, user]);
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);

    const { data: allExpenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: allTimeExpenses, isLoading: allTimeExpensesLoading } = useCollection<Expense>(allTimeExpensesQuery);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: allAccounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);
    const { data: tags, isLoading: tagsLoading } = useCollection<Tag>(tagsQuery);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const isLoading = expensesLoading || categoriesLoading || accountsLoading || tagsLoading || isInitialLoad || allTimeExpensesLoading;

    const availableYears = useMemo(() => {
        if (!allTimeExpenses) return [getYear(new Date()).toString()];
        const years = new Set(allTimeExpenses.map(e => getYear((e.date as Timestamp).toDate())));
        return Array.from(years).sort((a,b) => b - a).map(String);
    }, [allTimeExpenses]);
    
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(0, i), 'MMMM') })), []);

    useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(getYear(specificMonth).toString())) {
            const newDate = new Date(specificMonth);
            newDate.setFullYear(parseInt(availableYears[0]));
            setSpecificMonth(newDate);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableYears]);


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
    
    const timeRangeLabels: Record<TimeRangePreset, string> = {
        'week': 'This Week',
        'month': 'This Month',
        'last-month': 'Last Month',
        '3-months': 'Last 3 mo',
        '6-months': 'Last 6 mo',
        'year': 'This Year',
        'last-year': 'Last Year',
        'all': 'All Time',
        'specific-month': format(specificMonth, 'MMM yy'),
        'custom': 'Custom...'
    };

    return (
        <div className="w-full space-y-8">
            <PageHeader
                title="Expense Analysis"
                description="A detailed breakdown of your income and spending habits."
            >
                 <div className="flex items-center gap-1 flex-nowrap">
                    
                    <Popover open={monthPopoverOpen} onOpenChange={setMonthPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={monthPopoverOpen}
                                className="w-auto justify-between"
                            >
                                {timeRangeLabels[timeRangePreset]}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Command>
                                <CommandGroup>
                                    <CommandItem onSelect={() => { handleTimeRangeChange('week'); setMonthPopoverOpen(false); }}>This Week</CommandItem>
                                    <CommandItem onSelect={() => { handleTimeRangeChange('month'); setMonthPopoverOpen(false); }}>This Month</CommandItem>
                                    <CommandItem onSelect={() => { handleTimeRangeChange('last-month'); setMonthPopoverOpen(false); }}>Last Month</CommandItem>
                                    <CommandItem onSelect={() => { handleTimeRangeChange('3-months'); setMonthPopoverOpen(false); }}>Last 3 Months</CommandItem>
                                    <CommandItem onSelect={() => { handleTimeRangeChange('6-months'); setMonthPopoverOpen(false); }}>Last 6 Months</CommandItem>
                                    <CommandItem onSelect={() => { handleTimeRangeChange('year'); setMonthPopoverOpen(false); }}>This Year</CommandItem>
                                    <CommandItem onSelect={() => { handleTimeRangeChange('last-year'); setMonthPopoverOpen(false); }}>Last Year</CommandItem>
                                    <CommandItem onSelect={() => { handleTimeRangeChange('all'); setMonthPopoverOpen(false); }}>All Time</CommandItem>
                                </CommandGroup>
                                <CommandGroup className="border-t">
                                     <CommandItem onSelect={() => handleTimeRangeChange('custom')}>Custom Range</CommandItem>
                                    <CommandItem onSelect={() => handleTimeRangeChange('specific-month')}>
                                        <div className="w-full">
                                            Specific Month
                                            {timeRangePreset === 'specific-month' && (
                                                <div className="grid grid-cols-1 gap-2 mt-2">
                                                    <Select
                                                        value={getYear(specificMonth).toString()}
                                                        onValueChange={(year) => {
                                                            const newDate = new Date(specificMonth);
                                                            newDate.setFullYear(parseInt(year));
                                                            setSpecificMonth(newDate);
                                                        }}
                                                    >
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select
                                                        value={specificMonth.getMonth().toString()}
                                                        onValueChange={(month) => {
                                                            const newDate = new Date(specificMonth);
                                                            newDate.setMonth(parseInt(month));
                                                            setSpecificMonth(newDate);
                                                        }}
                                                    >
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {months.map(month => <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    </CommandItem>
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto justify-between">
                                <span>
                                    {selectedAccounts.length === 0
                                        ? "All Accts"
                                        : selectedAccounts.length === 1
                                        ? "1 Acct"
                                        : `${selectedAccounts.length} Accts`}
                                </span>
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

                     <div className="relative flex items-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-auto justify-between pr-8">
                                    <span>{selectedTags.length === 0 ? "All Tags" : selectedTags.length === 1 ? "1 Tag" : `${selectedTags.length} Tags`}</span>
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
                            <Button variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground" onClick={() => setSelectedTags([])}>
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
                                        <div className="flex flex-row items-center justify-between cursor-pointer p-6">
                                            <div className="space-y-1">
                                                <CardTitle>Spending by Category</CardTitle>
                                                <CardDescription>Your spending, organized by category.</CardDescription>
                                            </div>
                                            <ChevronDown className="h-5 w-5 transition-transform [&[data-state=open]]:-rotate-180" />
                                        </div>
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
                                <Collapsible defaultOpen>
                                    <Card>
                                        <CollapsibleTrigger asChild>
                                            <div className="flex flex-row items-center justify-between cursor-pointer p-6">
                                                <div className="space-y-1">
                                                    <CardTitle>Income vs. Expense Trend</CardTitle>
                                                    <CardDescription>Your cash flow over the selected period.</CardDescription>
                                                </div>
                                                <ChevronDown className="h-5 w-5 transition-transform [&[data-state=open]]:-rotate-180" />
                                            </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <CardContent>
                                                <SpendingTrendChart expenses={expensesForAnalysis} currency={userProfile?.defaultCurrency} timeRange={timeRangePreset} />
                                            </CardContent>
                                        </CollapsibleContent>
                                    </Card>
                                </Collapsible>
                            )}
                            {(analysisSettings?.showSavingsTrendChart ?? true) && (
                                <Collapsible defaultOpen>
                                    <Card>
                                        <CollapsibleTrigger asChild>
                                            <div className="flex flex-row items-center justify-between cursor-pointer p-6">
                                                <div className="space-y-1">
                                                    <CardTitle>Monthly Savings Trend</CardTitle>
                                                    <CardDescription>Your net savings each month.</CardDescription>
                                                </div>
                                                <ChevronDown className="h-5 w-5 transition-transform [&[data-state=open]]:-rotate-180" />
                                            </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <CardContent>
                                                <SavingsTrendChart expenses={expensesForAnalysis} currency={userProfile?.defaultCurrency} />
                                            </CardContent>
                                        </CollapsibleContent>
                                    </Card>
                                </Collapsible>
                            )}
                            {(analysisSettings?.showCategoryBarChart ?? true) && (
                                <Collapsible defaultOpen>
                                    <Card>
                                        <CollapsibleTrigger asChild>
                                             <div className="flex flex-row items-center justify-between cursor-pointer p-6">
                                                <div className="space-y-1">
                                                    <CardTitle>Top Spending Categories</CardTitle>
                                                    <CardDescription>A bar chart showing your top spending categories.</CardDescription>
                                                </div>
                                                <ChevronDown className="h-5 w-5 transition-transform [&[data-state=open]]:-rotate-180" />
                                            </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <CardContent>
                                                <CategoryBarChart expenses={expensesForAnalysis} currency={userProfile?.defaultCurrency} />
                                            </CardContent>
                                        </CollapsibleContent>
                                    </Card>
                                </Collapsible>
                            )}
                            {(analysisSettings?.showTagPieChart ?? true) && (
                                <Collapsible defaultOpen>
                                    <Card>
                                         <CollapsibleTrigger asChild>
                                             <div className="flex flex-row items-center justify-between cursor-pointer p-6">
                                                <div className="space-y-1">
                                                    <CardTitle>Spending by Tag</CardTitle>
                                                    <CardDescription>A breakdown of your expenses by tags.</CardDescription>
                                                </div>
                                                <ChevronDown className="h-5 w-5 transition-transform [&[data-state=open]]:-rotate-180" />
                                            </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <CardContent>
                                                <TagSpendingChart expenses={expensesForAnalysis} currency={userProfile?.defaultCurrency} />
                                            </CardContent>
                                        </CollapsibleContent>
                                    </Card>
                                </Collapsible>
                            )}
                            {(analysisSettings?.showIncomePieChart ?? true) && (
                                <Collapsible defaultOpen>
                                    <Card>
                                         <CollapsibleTrigger asChild>
                                             <div className="flex flex-row items-center justify-between cursor-pointer p-6">
                                                <div className="space-y-1">
                                                    <CardTitle>Income Sources</CardTitle>
                                                    <CardDescription>A breakdown of your income by category.</CardDescription>
                                                </div>
                                                <ChevronDown className="h-5 w-5 transition-transform [&[data-state=open]]:-rotate-180" />
                                            </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <CardContent>
                                                <IncomeBreakdownChart expenses={expensesForAnalysis} currency={userProfile?.defaultCurrency} />
                                            </CardContent>
                                        </CollapsibleContent>
                                    </Card>
                                </Collapsible>
                            )}
                        </div>
                        
                        {(analysisSettings?.showAiInsights ?? true) && (
                            <Collapsible defaultOpen>
                                <Card className="sticky top-24">
                                     <CollapsibleTrigger asChild>
                                         <div className="flex flex-row items-center justify-between cursor-pointer p-6">
                                            <div className="space-y-1">
                                                <CardTitle>AI-Powered Insights</CardTitle>
                                                <CardDescription>Let AI analyze your spending and provide personalized advice.</CardDescription>
                                            </div>
                                            <ChevronDown className="h-5 w-5 transition-transform [&[data-state=open]]:-rotate-180" />
                                        </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <CardContent>
                                            <AiInsights
                                                onGenerate={handleGenerateInsights}
                                                analysis={aiAnalysis}
                                                isLoading={isAiLoading}
                                                hasData={expensesForAnalysis.length > 0}
                                            />
                                        </CardContent>
                                    </CollapsibleContent>
                                </Card>
                            </Collapsible>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

    

    

    




