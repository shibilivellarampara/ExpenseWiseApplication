
'use client';

import { useState, useMemo } from 'react';
import { EnrichedSharedTransaction, UserProfile, SharedCategory, SharedTag } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { Input } from '../ui/input';
import { Search, ListFilter, X, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Checkbox } from '../ui/checkbox';
import { DateRange } from 'react-day-picker';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { getCurrencySymbol } from '@/lib/currencies';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';


interface Filters {
    searchQuery: string;
    members: string[];
    dateRange?: DateRange;
}

interface SharedTransactionsListProps {
    transactions: EnrichedSharedTransaction[];
    isLoading: boolean;
    memberProfiles: UserProfile[];
    categories: SharedCategory[];
    tags: SharedTag[];
}

export function SharedTransactionsList({ transactions, isLoading, memberProfiles, categories, tags }: SharedTransactionsListProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: currentUserProfile } = useDoc<UserProfile>(userProfileRef);
    const currencySymbol = getCurrencySymbol(currentUserProfile?.defaultCurrency);


    const [filters, setFilters] = useState<Filters>({
        searchQuery: '',
        members: [],
        dateRange: undefined
    });

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const query = filters.searchQuery.toLowerCase();
            const memberIds = filters.members;
            const { from, to } = filters.dateRange || {};

            const searchMatch = query ? tx.description.toLowerCase().includes(query) || String(tx.amount).includes(query) : true;
            const memberMatch = memberIds.length > 0 ? memberIds.includes(tx.createdBy) : true;
            const dateMatch = (!from || tx.date >= from) && (!to || tx.date <= to);
            
            return searchMatch && memberMatch && dateMatch;
        });
    }, [transactions, filters]);

    const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No Transactions Yet</h3>
                <p className="text-muted-foreground mt-2">Click "Add Transaction" to get started.</p>
            </div>
        );
    }


    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                 <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by description or amount..."
                        value={filters.searchQuery}
                        onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                        className="pl-8"
                    />
                </div>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline">
                            <ListFilter className="mr-2 h-4 w-4" />
                            Filters
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                         <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Filter by Member</h4>
                                <Command>
                                    <CommandInput placeholder="Search members..." />
                                    <CommandList>
                                        <CommandEmpty>No member found.</CommandEmpty>
                                        <CommandGroup>
                                            {memberProfiles.map(profile => (
                                                <CommandItem
                                                    key={profile.id}
                                                    onSelect={() => {
                                                        const newMembers = filters.members.includes(profile.id)
                                                            ? filters.members.filter(id => id !== profile.id)
                                                            : [...filters.members, profile.id];
                                                        handleFilterChange('members', newMembers);
                                                    }}
                                                >
                                                    <Checkbox checked={filters.members.includes(profile.id)} className="mr-2" />
                                                    {profile.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </div>
                            <div className="space-y-2">
                                 <h4 className="font-medium leading-none">Filter by Date</h4>
                                 <Calendar
                                    mode="range"
                                    selected={filters.dateRange}
                                    onSelect={(range) => handleFilterChange('dateRange', range)}
                                    numberOfMonths={1}
                                />
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
            
            <Card>
                <div className="divide-y">
                    {filteredTransactions.map(tx => (
                        <div key={tx.id} className="p-4 flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={tx.member?.photoURL || undefined} alt={tx.member?.name || ''} />
                                <AvatarFallback>{getInitials(tx.member?.name)}</AvatarFallback>
                            </Avatar>
                             <div className="flex-grow">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold">{tx.description}</p>
                                    <p className={cn("font-bold text-lg", tx.type === 'income' ? 'text-green-600' : 'text-red-500')}>
                                         {tx.type === 'income' ? '+' : '-'}{currencySymbol}{tx.amount.toFixed(2)}
                                    </p>
                                </div>
                                 <p className="text-sm text-muted-foreground">
                                    Added by {tx.member?.name || 'Unknown'} on {tx.date.toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

    