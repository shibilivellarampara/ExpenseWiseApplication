
'use client';

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
        <div className="flex gap-2">
            <div className="flex gap-2 flex-grow">
                 <Select value={filters.status} onValueChange={(value) => handleStatusChange(value as any)}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filter by status..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="settled">Settled</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filters.type} onValueChange={(value) => handleTypeChange(value as any)}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filter by type..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="lent">Lent</SelectItem>
                        <SelectItem value="borrowed">Borrowed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Select value={sortBy} onValueChange={(value) => onSortChange(value as DebtSortState)}>
                <SelectTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                        <ArrowUpDown className="h-4 w-4" />
                        <span className="sr-only">Sort by</span>
                    </Button>
                </SelectTrigger>
                <SelectContent align="end">
                    <SelectItem value="recent">Recent Activity</SelectItem>
                    <SelectItem value="name">Person's Name (A-Z)</SelectItem>
                    <SelectItem value="owedToYou">Owed to You (High to Low)</SelectItem>
                    <SelectItem value="youOwe">You Owe (High to Low)</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
