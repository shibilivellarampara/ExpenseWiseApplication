'use client';

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filter, ArrowUpDown } from "lucide-react";

export type DebtFilterState = {
    status: 'all' | 'pending' | 'settled';
    type: 'all' | 'lent' | 'borrowed';
}

export type DebtSortState = 'recent' | 'name' | 'owedToYou' | 'youOwe';

interface DebtsFiltersProps {
    filters: DebtFilterState;
    onFilterChange: (filters: DebtFilterState) => void;
    sortBy: DebtSortState;
    onSortChange: (sortBy: DebtSortState) => void;
}

export function DebtsFilters({ filters, onFilterChange, sortBy, onSortChange }: DebtsFiltersProps) {

    const handleStatusChange = (status: 'all' | 'pending' | 'settled') => {
        onFilterChange({ ...filters, status });
    };

    const handleTypeChange = (type: 'all' | 'lent' | 'borrowed') => {
        onFilterChange({ ...filters, type });
    };

    return (
        <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-grow">
                <Tabs value={filters.status} onValueChange={(value) => handleStatusChange(value as any)} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="pending">Pending</TabsTrigger>
                        <TabsTrigger value="settled">Settled</TabsTrigger>
                    </TabsList>
                </Tabs>
                 <Tabs value={filters.type} onValueChange={(value) => handleTypeChange(value as any)} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="all">All Types</TabsTrigger>
                        <TabsTrigger value="lent">Lent</TabsTrigger>
                        <TabsTrigger value="borrowed">Borrowed</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <Select value={sortBy} onValueChange={(value) => onSortChange(value as DebtSortState)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="recent">Recent Activity</SelectItem>
                    <SelectItem value="name">Person's Name (A-Z)</SelectItem>
                    <SelectItem value="owedToYou">Owed to You (High to Low)</SelectItem>
                    <SelectItem value="youOwe">You Owe (High to Low)</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
