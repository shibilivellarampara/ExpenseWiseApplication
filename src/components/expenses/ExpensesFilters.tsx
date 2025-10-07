
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronDown, FilterX } from 'lucide-react';
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

    return (
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
            {/* Date Range Select */}
            <Select value={dateRangePreset} onValueChange={handleDateRangePresetChange}>
                <SelectTrigger className="w-full md:w-[180px]">
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
            
            {/* Custom Date Range Picker */}
            {dateRangePreset === 'custom' && (
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full md:w-[300px] justify-start text-left font-normal",
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

            {/* Type Filter */}
            <Select value={filters.type} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
            </Select>

            {/* Category Filter */}
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto">
                        Categories ({filters.categories.length || 'All'})
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
                            onCheckedChange={() => handleCategoryChange(category.id)}
                        >
                            {category.name}
                        </DropdownMenuCheckboxItem>
                     ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Account Filter */}
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto">
                        Accounts ({filters.accounts.length || 'All'})
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
                            onCheckedChange={() => handleAccountChange(account.id)}
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
    );
}
