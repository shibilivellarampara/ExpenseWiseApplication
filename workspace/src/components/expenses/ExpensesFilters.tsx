'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ListFilter, Search, X, Check, ChevronDown, Pilcrow, RotateCcw } from 'lucide-react';
import { Account, Category, Tag } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Command, CommandGroup, CommandList, CommandInput, CommandItem } from '@/components/ui/command';
import * as LucideIcons from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type DateRange = { from: Date | undefined; to: Date | undefined; };

export type Filters = {
    dateRange: DateRange;
    type: 'all' | 'income' | 'expense';
    categories: string[];
    accounts: string[];
    tags: string[];
    searchQuery: string;
    billingCycle?: string;
}

interface ExpensesFiltersProps {
    filters: Filters;
    onFiltersChange: (filters: Filters) => void;
    accounts: Account[];
    categories: Category[];
    tags: Tag[];
    disableDateFilter?: boolean;
}

const renderIcon = (iconName: string | undefined, className?: string) => {
    if (!iconName) return null;
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className={cn("h-3.5 w-3.5", className)} /> : <Pilcrow className={cn("h-3.5 w-3.5", className)} />;
};

function FiltersContent({ filters, onFiltersChange, accounts, categories, tags }: ExpensesFiltersProps) {
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
    
    const createMultiSelect = (
        title: string,
        field: 'categories' | 'accounts' | 'tags',
        items: (Category | Account | Tag)[],
        placeholder: string
    ) => (
        <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{title}</h4>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-10 rounded-xl text-xs font-medium">
                        <span>{filters[field].length > 0 ? `${filters[field].length} selected` : placeholder}</span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[280px] rounded-xl border-none shadow-2xl p-1" align="start">
                    <Command shouldFilter={true}>
                        <CommandInput placeholder={`Search ${title.toLowerCase()}...`} className="h-10 text-xs" />
                        <CommandList className="max-h-[240px] no-scrollbar">
                            <CommandGroup className="p-1">
                                {items.map(item => (
                                    <CommandItem
                                        key={item.id}
                                        value={item.name.toLowerCase()}
                                        onSelect={() => handleMultiSelectChange(field, item.id)}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors",
                                            filters[field].includes(item.id) ? "bg-primary/5 text-primary" : "hover:bg-accent"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            {'icon' in item && renderIcon(item.icon)}
                                            {item.name}
                                        </div>
                                         <Check className={cn("h-3.5 w-3.5", filters[field].includes(item.id) ? "opacity-100" : "opacity-0")} />
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
        <div className="grid gap-5">
            {createMultiSelect('Accounts', 'accounts', accounts, 'All Accounts')}
            {createMultiSelect('Categories', 'categories', categories, 'All Categories')}
            {createMultiSelect('Tags', 'tags', tags, 'All Tags')}

            <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Transaction Type</h4>
                <div className="grid grid-cols-3 gap-1 bg-muted/50 p-1 rounded-xl">
                    {['all', 'income', 'expense'].map((t) => (
                        <button
                            key={t}
                            onClick={() => handleTypeChange(t as any)}
                            className={cn(
                                "py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                filters.type === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground/60 hover:text-foreground"
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export function ExpensesFilters(props: ExpensesFiltersProps) {
    const { filters, onFiltersChange, accounts, categories, tags } = props;

    const clearFilters = useCallback(() => {
        onFiltersChange({
            dateRange: { from: undefined, to: undefined },
            type: 'all',
            categories: [],
            accounts: [],
            tags: [],
            searchQuery: '',
        });
    }, [onFiltersChange]);
    
    const activeFilterCount = useMemo(() => 
        (filters.type !== 'all' ? 1 : 0) +
        filters.categories.length +
        filters.accounts.length +
        filters.tags.length,
    [filters]);
    
    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2 bg-muted/20 -mx-4 px-4 py-3 overflow-x-auto no-scrollbar pr-4">
                <div className={cn(
                    "relative group transition-all duration-300 ease-in-out",
                    activeFilterCount > 0 ? "flex-[0.7]" : "flex-[0.75]"
                )}>
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                    <Input
                        type="search"
                        placeholder="Search transactions..."
                        value={filters.searchQuery}
                        onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
                        className="pl-9 pr-9 h-10 rounded-full bg-transparent border border-muted-foreground/20 shadow-none focus-visible:ring-0 text-sm"
                    />
                    {filters.searchQuery && (
                        <button
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                            onClick={() => onFiltersChange({ ...filters, searchQuery: '' })}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                
                <div className={cn(
                    "transition-all duration-300 ease-in-out",
                    activeFilterCount > 0 ? "flex-[0.2]" : "flex-[0.25]"
                )}>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-10 w-full rounded-full border-muted-foreground/20 bg-transparent hover:bg-card shrink-0 gap-2 relative">
                                <ListFilter className="h-4 w-4" />
                                <span className="hidden sm:inline font-bold text-[11px] uppercase tracking-widest">Filter</span>
                                {activeFilterCount > 0 && 
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground font-bold border-2 border-background animate-in zoom-in">{activeFilterCount}</span>
                                }
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-5 rounded-[24px] border-none shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card" align="end" sideOffset={12}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-sm tracking-tight">Advanced Filters</h3>
                                {activeFilterCount > 0 && (
                                    <button onClick={clearFilters} className="text-[10px] font-bold text-primary uppercase tracking-widest hover:opacity-70 transition-opacity">
                                        Reset All
                                    </button>
                                )}
                            </div>
                            <FiltersContent {...props} />
                        </PopoverContent>
                    </Popover>
                </div>

                {activeFilterCount > 0 && (
                    <div className="flex-[0.1] transition-all duration-300 animate-in fade-in slide-in-from-right-2">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={clearFilters}
                            title="Clear All Filters"
                            className="h-10 w-10 rounded-full border-muted-foreground/20 bg-transparent hover:bg-card text-muted-foreground hover:text-destructive transition-all"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
            
            {activeFilterCount > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                    <div className="flex gap-2 items-center">
                        {filters.accounts.map(id => {
                            const item = accounts.find(c => c.id === id);
                            return item ? (
                                <Badge key={id} variant="secondary" className="h-8 rounded-full pl-3 pr-1 py-0 bg-primary/5 text-primary border-primary/10 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                                    {item.name}
                                    <button onClick={() => onFiltersChange({...filters, accounts: filters.accounts.filter(c => c !== id)})} className="p-1 hover:bg-primary/10 rounded-full transition-colors">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ) : null;
                        })}
                        {filters.categories.map(id => {
                            const item = categories.find(c => c.id === id);
                            return item ? (
                                <Badge key={id} variant="secondary" className="h-8 rounded-full pl-3 pr-1 py-0 bg-primary/5 text-primary border-primary/10 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                                    {item.name}
                                    <button onClick={() => onFiltersChange({...filters, categories: filters.categories.filter(c => c !== id)})} className="p-1 hover:bg-primary/10 rounded-full transition-colors">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ) : null;
                        })}
                        {filters.tags.map(id => {
                            const item = tags.find(t => t.id === id);
                            return item ? (
                                <Badge key={id} variant="secondary" className="h-8 rounded-full pl-3 pr-1 py-0 bg-primary/5 text-primary border-primary/10 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                                    {item.name}
                                    <button onClick={() => onFiltersChange({...filters, tags: filters.tags.filter(t => t !== id)})} className="p-1 hover:bg-primary/10 rounded-full transition-colors">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ) : null;
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}