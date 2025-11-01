

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, FilterX, ListFilter, Pilcrow } from 'lucide-react';
import { Check, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Account, Category, Tag } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import * as LucideIcons from 'lucide-react';
import { Badge } from '../ui/badge';


export type DateRange = { from: Date | undefined; to: Date | undefined; };

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
        onFiltersChange({ ...filters, [field]: newValues });
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
                    <Button variant="outline" className="w-full justify-between">
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
            {createMultiSelect('Categories', 'categories', categories, 'Select categories')}
            <Separator />
            {createMultiSelect('Accounts', 'accounts', accounts, 'Select accounts')}
            <Separator />
            {createMultiSelect('Tags', 'tags', tags, 'Select tags')}
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
        </div>
    )
}

export function ExpensesFilters({ filters, onFiltersChange, accounts, categories, tags }: ExpensesFiltersProps) {

    const [dateRangePreset, setDateRangePreset] = useState<string>('all');
    
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
        filters.categories.length +
        filters.accounts.length +
        filters.tags.length;

    return (
        <div className="flex flex-wrap gap-2 items-center">
            <Popover>
                <PopoverTrigger asChild>
                     <Button variant="outline" className="relative">
                        <ListFilter className="mr-2 h-4 w-4" />
                        Filters
                        {activeFilterCount > 0 && 
                            <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 justify-center p-0 rounded-full">{activeFilterCount}</Badge>
                        }
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="start">
                    <div className="flex justify-between items-center mb-4">
                         <h3 className="font-medium">Filter Transactions</h3>
                         {activeFilterCount > 0 && (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                                Clear all
                            </Button>
                         )}
                    </div>
                     <FiltersContent {...{ filters, onFiltersChange, accounts, categories, tags, setDateRangePreset, dateRangePreset }} />
                </PopoverContent>
            </Popover>
            
            
            {activeFilterCount > 0 && (
                <>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex flex-wrap gap-1 items-center">
                    {filters.categories.map(id => {
                        const item = categories.find(c => c.id === id);
                        return item ? <Badge key={id} variant="secondary" className="cursor-pointer" onClick={() => onFiltersChange({...filters, categories: filters.categories.filter(c => c !== id)})}>{item.name} <X className="ml-1 h-3 w-3" /></Badge> : null
                    })}
                     {filters.accounts.map(id => {
                        const item = accounts.find(c => c.id === id);
                        return item ? <Badge key={id} variant="secondary" className="cursor-pointer" onClick={() => onFiltersChange({...filters, accounts: filters.accounts.filter(c => c !== id)})}>{item.name} <X className="ml-1 h-3 w-3" /></Badge> : null
                    })}
                     {filters.tags.map(id => {
                        const item = tags.find(c => c.id === id);
                        return item ? <Badge key={id} variant="secondary" className="cursor-pointer" onClick={() => onFiltersChange({...filters, tags: filters.tags.filter(c => c !== id)})}>{item.name} <X className="ml-1 h-3 w-3" /></Badge> : null
                    })}
                </div>
                 <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground h-auto p-1">
                    <FilterX className="h-4 w-4" />
                </Button>
                </>
            )}
        </div>
    );
}
