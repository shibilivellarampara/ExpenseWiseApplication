
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronDown, FilterX, ListFilter, Pilcrow, Check } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { DateRange as ReactDateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, parseISO, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Account, Category, Tag } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
  } from '@/components/ui/sheet';
import { Separator } from '../ui/separator';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import * as LucideIcons from 'lucide-react';
import { Badge } from '../ui/badge';


export type DateRange = ReactDateRange;

type Filters = {
    dateRange: DateRange;
    type: 'all' | 'income' | 'expense';
    categories: string[];
    accounts: string[];
    tags: string[];
}
interface ExpensesFiltersProps {
    filters: Filters;
    onFiltersChange: (filters: Filters) => void;
    accounts: Account[];
    categories: Category[];
    tags: Tag[];
}

const renderIcon = (iconName: string | undefined, className?: string) => {
    if (!iconName) return null;
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className={cn("h-4 w-4 text-muted-foreground", className)} /> : <Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
};


function FiltersContent({ filters, onFiltersChange, accounts, categories, tags, setDateRangePreset, dateRangePreset }: ExpensesFiltersProps & { setDateRangePreset: (preset: string) => void, dateRangePreset: string }) {
    
    const handleDateRangePresetChange = (preset: string) => {
        setDateRangePreset(preset);
        let from: Date | undefined;
        let to: Date | undefined;
        const now = new Date();

        switch (preset) {
            case 'this-month':
                from = startOfMonth(now);
                to = endOfMonth(now);
                break;
            case 'last-month':
                const lastMonth = subMonths(now, 1);
                from = startOfMonth(lastMonth);
                to = endOfMonth(lastMonth);
                break;
            case 'this-year':
                from = startOfYear(now);
                to = endOfYear(now);
                break;
            case 'all':
            default:
                from = undefined;
                to = undefined;
                break;
        }
        onFiltersChange({ ...filters, dateRange: { from, to } });
    }

    const handleDateChange = (date: Date | undefined, field: 'from' | 'to') => {
        setDateRangePreset('custom');
        onFiltersChange({ ...filters, dateRange: { ...filters.dateRange, [field]: date } });
    }
    
    const handleTypeChange = (type: 'all' | 'income' | 'expense') => {
        onFiltersChange({ ...filters, type });
    }

    const handleMultiSelectChange = (field: 'categories' | 'accounts' | 'tags', value: string) => {
        const currentValues = filters[field] || [];
        const newValues = currentValues.includes(value)
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value];

        // This logic allows combining filters, which might require complex indexes.
        // For simplicity and to avoid index errors, we will reset other multi-select filters.
        const updatedFilters: Filters = { 
            ...filters, 
            categories: field === 'categories' ? newValues : filters.categories,
            accounts: field === 'accounts' ? newValues : filters.accounts,
            tags: field === 'tags' ? newValues : filters.tags,
        };

        if (field === 'categories') updatedFilters.accounts = []; updatedFilters.tags = [];
        if (field === 'accounts') updatedFilters.categories = []; updatedFilters.tags = [];
        if (field === 'tags') updatedFilters.categories = []; updatedFilters.accounts = [];

        onFiltersChange(updatedFilters);
    }
    
    const formatDateForInput = (date: Date | undefined): string => {
        return date ? format(date, 'yyyy-MM-dd') : '';
    }

    const createMultiSelect = (
        title: string,
        field: 'categories' | 'accounts' | 'tags',
        items: (Category | Account | Tag)[],
        placeholder: string
    ) => (
        <div>
            <h4 className="text-sm font-medium mb-2">{title}</h4>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between"
                        disabled={(field === 'accounts' && (filters.categories.length > 0 || filters.tags.length > 0)) ||
                                  (field === 'categories' && (filters.accounts.length > 0 || filters.tags.length > 0)) ||
                                  (field === 'tags' && (filters.accounts.length > 0 || filters.categories.length > 0))}
                    >
                        <span>{filters[field].length > 0 ? `${filters[field].length} selected` : placeholder}</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                    <Command>
                        <CommandInput placeholder={`Search ${title.toLowerCase()}...`} />
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup>
                                {items.map(item => (
                                    <CommandItem
                                        key={item.id}
                                        onSelect={() => handleMultiSelectChange(field, item.id)}
                                        className="flex justify-between cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            {'icon' in item && renderIcon(item.icon)}
                                            {item.name}
                                        </div>
                                         {filters[field].includes(item.id) && <Check className="h-4 w-4" />}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </DropdownMenuContent>
            </DropdownMenu>
            <p className="text-xs text-muted-foreground mt-1">You can only filter by one group (Categories, Accounts, or Tags) at a time.</p>
        </div>
    );

    return (
        <div className="grid gap-4">
            <div>
                <h4 className="text-sm font-medium mb-2">Date Range</h4>
                 <Select value={dateRangePreset} onValueChange={handleDateRangePresetChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="this-month">This Month</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="this-year">This Year</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                </Select>
                 {dateRangePreset === 'custom' && (
                     <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="space-y-1">
                            <Label htmlFor="from-date" className="text-xs">From</Label>
                            <Input
                                id="from-date"
                                type="date"
                                value={formatDateForInput(filters.dateRange?.from)}
                                onChange={(e) => handleDateChange(e.target.valueAsDate ?? undefined, 'from')}
                                className="text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                             <Label htmlFor="to-date" className="text-xs">To</Label>
                            <Input
                                id="to-date"
                                type="date"
                                value={formatDateForInput(filters.dateRange?.to)}
                                onChange={(e) => handleDateChange(e.target.valueAsDate ?? undefined, 'to')}
                                className="text-sm"
                            />
                        </div>
                     </div>
                )}
            </div>
            <Separator />
            <div>
                <h4 className="text-sm font-medium mb-2">Transaction Type</h4>
                <Select value={filters.type} onValueChange={handleTypeChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Transaction Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Separator />
            {createMultiSelect('Categories', 'categories', categories, 'Select categories')}
            <Separator />
            {createMultiSelect('Accounts', 'accounts', accounts, 'Select accounts')}
            <Separator />
            {createMultiSelect('Tags', 'tags', tags, 'Select tags')}
        </div>
    )
}

export function ExpensesFilters({ filters, onFiltersChange, accounts, categories, tags }: ExpensesFiltersProps) {

    const [dateRangePreset, setDateRangePreset] = useState<string>('all');

    const handleCustomDateChange = (range: DateRange | undefined) => {
        if (range) {
            setDateRangePreset('custom');
            onFiltersChange({ ...filters, dateRange: range });
        }
    }

    const clearFilters = () => {
        onFiltersChange({
            dateRange: { from: undefined, to: undefined },
            type: 'all',
            categories: [],
            accounts: [],
            tags: [],
        });
        setDateRangePreset('all');
    };
    
    const activeFilterCount =
        (filters.dateRange.from || filters.dateRange.to ? 1 : 0) +
        (filters.type !== 'all' ? 1 : 0) +
        (filters.categories.length > 0 ? 1 : 0) +
        (filters.accounts.length > 0 ? 1 : 0) +
        (filters.tags.length > 0 ? 1 : 0);

    return (
        <div className="flex flex-wrap gap-2 items-center">
            {/* Filter Sheet for mobile */}
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" className="md:hidden flex-1 relative">
                        <ListFilter className="mr-2 h-4 w-4" />
                        Filters
                        {activeFilterCount > 0 && 
                            <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 justify-center p-0">{activeFilterCount}</Badge>
                        }
                    </Button>
                </SheetTrigger>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Filters</SheetTitle>
                        <SheetDescription>
                            Refine your transaction list.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="py-4">
                        <FiltersContent {...{ filters, onFiltersChange, accounts, categories, tags, setDateRangePreset, dateRangePreset }} />
                    </div>
                </SheetContent>
            </Sheet>
            
            {/* Inline filters for desktop */}
            <div className="hidden md:flex flex-wrap gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal",
                            !filters.dateRange?.from && "text-muted-foreground"
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange?.from ? (
                            filters.dateRange.to ? (
                            <>
                                {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                                {format(filters.dateRange.to, "LLL dd, y")}
                            </>
                            ) : (
                            format(filters.dateRange.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={filters.dateRange?.from}
                        selected={filters.dateRange}
                        onSelect={handleCustomDateChange}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>

                <Select value={filters.type} onValueChange={(value) => onFiltersChange({...filters, type: value as any})}>
                    <SelectTrigger className="w-auto">
                        <SelectValue placeholder="Transaction Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                </Select>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full md:w-auto" disabled={filters.accounts.length > 0 || filters.tags.length > 0}>
                            Category ({filters.categories.length || 'All'})
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                        <Command>
                            <CommandInput placeholder="Filter by category..." />
                            <CommandList>
                                <CommandEmpty>No category found.</CommandEmpty>
                                <CommandGroup>
                                {categories.map((category) => (
                                    <CommandItem
                                        key={category.id}
                                        onSelect={() => {
                                            const newSelection = filters.categories.includes(category.id) ? [] : [category.id];
                                            onFiltersChange({ ...filters, categories: newSelection, accounts:[], tags: [] });
                                        }}
                                    >
                                        <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", filters.categories.includes(category.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        {category.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full md:w-auto" disabled={filters.categories.length > 0 || filters.tags.length > 0}>
                            Account ({filters.accounts.length || 'All'})
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                     <DropdownMenuContent className="w-56">
                        <Command>
                            <CommandInput placeholder="Filter by account..." />
                            <CommandList>
                                <CommandEmpty>No account found.</CommandEmpty>
                                <CommandGroup>
                                {accounts.map((account) => (
                                    <CommandItem
                                        key={account.id}
                                        onSelect={() => {
                                            const newSelection = filters.accounts.includes(account.id) ? filters.accounts.filter(a => a !== account.id) : [...filters.accounts, account.id];
                                            onFiltersChange({ ...filters, accounts: newSelection, categories: [], tags: [] });
                                        }}
                                    >
                                        <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", filters.accounts.includes(account.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        {account.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full md:w-auto" disabled={filters.accounts.length > 0 || filters.categories.length > 0}>
                            Tags ({filters.tags.length || 'All'})
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                     <DropdownMenuContent className="w-56">
                        <Command>
                            <CommandInput placeholder="Filter by tag..." />
                            <CommandList>
                                <CommandEmpty>No tag found.</CommandEmpty>
                                <CommandGroup>
                                {tags.map((tag) => (
                                    <CommandItem
                                        key={tag.id}
                                        onSelect={() => {
                                            const newSelection = filters.tags.includes(tag.id) ? filters.tags.filter(t => t !== tag.id) : [...filters.tags, tag.id];
                                            onFiltersChange({ ...filters, tags: newSelection, categories:[], accounts: [] });
                                        }}
                                    >
                                        <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", filters.tags.includes(tag.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        {tag.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </DropdownMenuContent>
                </DropdownMenu>
                
                {activeFilterCount > 0 && (
                    <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
                        <FilterX className="mr-2 h-4 w-4" />
                        Clear
                    </Button>
                )}
            </div>
        </div>
    );
}
