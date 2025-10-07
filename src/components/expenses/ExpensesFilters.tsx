
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronDown, FilterX, ListFilter } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { DateRange as ReactDateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Account, Category } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

export type DateRange = ReactDateRange;

type Filters = {
    dateRange: DateRange;
    type: 'all' | 'income' | 'expense';
    categories: string[];
    accounts: string[];
}
interface ExpensesFiltersProps {
    filters: Filters;
    onFiltersChange: (filters: Filters) => void;
    accounts: Account[];
    categories: Category[];
}

function FiltersContent({ filters, onFiltersChange, accounts, categories, setDateRangePreset, dateRangePreset }: ExpensesFiltersProps & { setDateRangePreset: (preset: string) => void, dateRangePreset: string }) {
    
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

    const handleCustomDateChange = (range: DateRange | undefined) => {
        if (range) {
            setDateRangePreset('custom');
            onFiltersChange({ ...filters, dateRange: range });
        }
    }
    
    const handleTypeChange = (type: 'all' | 'income' | 'expense') => {
        onFiltersChange({ ...filters, type });
    }

    const handleCategoryChange = (categoryId: string) => {
        const newCategories = filters.categories.includes(categoryId)
            ? filters.categories.filter(c => c !== categoryId)
            : [...filters.categories, categoryId];
        onFiltersChange({ ...filters, categories: newCategories });
    }
    
    const handleAccountChange = (accountId: string) => {
        const newAccounts = filters.accounts.includes(accountId)
            ? filters.accounts.filter(a => a !== accountId)
            : [...filters.accounts, accountId];
        onFiltersChange({ ...filters, accounts: newAccounts });
    }
    
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
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal mt-2",
                                !filters.dateRange && "text-muted-foreground"
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
                                <span>Pick a date</span>
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
            <div>
                <h4 className="text-sm font-medium mb-2">Categories</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                    {categories.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id={`cat-${category.id}`}
                                checked={filters.categories.includes(category.id)}
                                onChange={() => handleCategoryChange(category.id)}
                                className="form-checkbox h-4 w-4 text-primary rounded"
                            />
                            <label htmlFor={`cat-${category.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {category.name}
                            </label>
                        </div>
                     ))}
                </div>
            </div>
            <Separator />
            <div>
                <h4 className="text-sm font-medium mb-2">Accounts</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                    {accounts.map((account) => (
                        <div key={account.id} className="flex items-center space-x-2">
                             <input
                                type="checkbox"
                                id={`acc-${account.id}`}
                                checked={filters.accounts.includes(account.id)}
                                onChange={() => handleAccountChange(account.id)}
                                className="form-checkbox h-4 w-4 text-primary rounded"
                            />
                            <label htmlFor={`acc-${account.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {account.name}
                            </label>
                        </div>
                     ))}
                </div>
            </div>
        </div>
    )
}

export function ExpensesFilters({ filters, onFiltersChange, accounts, categories }: ExpensesFiltersProps) {

    const [dateRangePreset, setDateRangePreset] = useState<string>('all');

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

    const clearFilters = () => {
        onFiltersChange({
            dateRange: { from: undefined, to: undefined },
            type: 'all',
            categories: [],
            accounts: [],
        });
        setDateRangePreset('all');
    };
    
    const hasActiveFilters = filters.dateRange.from || filters.type !== 'all' || filters.categories.length > 0 || filters.accounts.length > 0;
    const activeFilterCount = (filters.dateRange.from ? 1 : 0) + (filters.type !== 'all' ? 1 : 0) + filters.categories.length + filters.accounts.length;

    return (
        <div className="flex flex-wrap gap-2 items-center">
            {/* Filter Sheet for mobile */}
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" className="md:hidden flex-1">
                        <ListFilter className="mr-2 h-4 w-4" />
                        Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
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
                        <FiltersContent {...{ filters, onFiltersChange, accounts, categories, setDateRangePreset, dateRangePreset }} />
                    </div>
                </SheetContent>
            </Sheet>
            
            {/* Inline filters for desktop */}
            <div className="hidden md:flex gap-2">
                <Select value={dateRangePreset} onValueChange={handleDateRangePresetChange}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            <SelectValue placeholder="Select date range" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="this-month">This Month</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="this-year">This Year</SelectItem>
                    </SelectContent>
                </Select>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full md:w-auto">
                            Entry Type
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                         <Select value={filters.type} onValueChange={(value) => onFiltersChange({...filters, type: value as any})}>
                            <SelectTrigger className="border-none focus:ring-0">
                                <SelectValue placeholder="Transaction Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="income">Income</SelectItem>
                                <SelectItem value="expense">Expense</SelectItem>
                            </SelectContent>
                        </Select>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full md:w-auto">
                            Category ({filters.categories.length || 'All'})
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                        <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {categories.map((category) => (
                            <DropdownMenuCheckboxItem
                                key={category.id}
                                checked={filters.categories.includes(category.id)}
                                onCheckedChange={() => {
                                    const newCategories = filters.categories.includes(category.id)
                                        ? filters.categories.filter(c => c !== category.id)
                                        : [...filters.categories, category.id];
                                    onFiltersChange({ ...filters, categories: newCategories });
                                }}
                            >
                                {category.name}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full md:w-auto">
                            Account ({filters.accounts.length || 'All'})
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                        <DropdownMenuLabel>Filter by Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {accounts.map((account) => (
                            <DropdownMenuCheckboxItem
                                key={account.id}
                                checked={filters.accounts.includes(account.id)}
                                onCheckedChange={() => {
                                     const newAccounts = filters.accounts.includes(account.id)
                                        ? filters.accounts.filter(a => a !== account.id)
                                        : [...filters.accounts, account.id];
                                    onFiltersChange({ ...filters, accounts: newAccounts });
                                }}
                            >
                                {account.name}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                
                {hasActiveFilters && (
                    <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
                        <FilterX className="mr-2 h-4 w-4" />
                        Clear
                    </Button>
                )}
            </div>
        </div>
    );
}
