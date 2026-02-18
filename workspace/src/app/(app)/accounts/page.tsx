'use client';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, X } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { Account, UserProfile } from '@/lib/types';
import { collection, orderBy, query, doc } from 'firebase/firestore';
import { AddAccountSheet } from '@/components/accounts/AddAccountSheet';
import { AccountsList } from '@/components/accounts/AccountsList';
import { AccountsSummary } from '@/components/accounts/AccountsSummary';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';

export default function AccountsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [searchQuery, setSearchQuery] = useState('');

    const accountsQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/accounts`), orderBy('name', 'asc')) : null
    , [firestore, user]);

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);

    const { data: accounts, isLoading } = useCollection<Account>(accountsQuery);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const filteredAccounts = useMemo(() => {
        if (!accounts) return [];
        return accounts.filter(acc => 
            acc.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [accounts, searchQuery]);

    return (
        <div className="w-full space-y-6 pb-32">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold font-headline text-foreground">Accounts</h1>
            </div>

            <AccountsSummary 
                accounts={accounts || []} 
                isLoading={isLoading} 
                currency={userProfile?.defaultCurrency}
            />

            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search accounts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-12 bg-card border-none shadow-sm rounded-2xl"
                    />
                    {searchQuery && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                            onClick={() => setSearchQuery('')}
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    )}
                </div>
                <AddAccountSheet>
                     <Button className="h-12 px-6 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-2xl shadow-none gap-2 shrink-0">
                        <PlusCircle className="h-5 w-5" />
                        <span className="hidden sm:inline">Add Account</span>
                        <span className="sm:hidden">Add</span>
                    </Button>
                </AddAccountSheet>
            </div>

            <AccountsList 
                accounts={filteredAccounts} 
                isLoading={isLoading} 
                searchActive={!!searchQuery}
            />
        </div>
    )
}
