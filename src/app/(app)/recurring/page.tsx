
'use client';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { RecurringExpense } from '@/lib/types';
import { collection, orderBy, query } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { AddRecurringDialog } from '@/components/recurring/AddRecurringDialog';
import { RecurringList } from '@/components/recurring/RecurringList';

export default function RecurringPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [searchQuery, setSearchQuery] = useState('');

    const recurringQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/recurringExpenses`), orderBy('name', 'asc')) : null
    , [firestore, user]);

    const { data: recurringItems, isLoading } = useCollection<RecurringExpense>(recurringQuery);

    const filteredItems = useMemo(() => {
        if (!recurringItems) return [];
        return recurringItems.filter(item => 
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [recurringItems, searchQuery]);

    return (
        <div className="w-full space-y-6 pb-32">
            <PageHeader 
                title="Recurring" 
                description="Manage your subscriptions and recurring bills."
            >
                <AddRecurringDialog>
                    <Button className="h-10 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md gap-2">
                        <PlusCircle className="h-4 w-4" />
                        <span>Add Recurring</span>
                    </Button>
                </AddRecurringDialog>
            </PageHeader>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search recurring items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-12 bg-card border-none shadow-sm rounded-2xl"
                />
            </div>

            <RecurringList 
                items={filteredItems} 
                isLoading={isLoading} 
            />
        </div>
    );
}
