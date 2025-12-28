'use client';

import { useMemo } from 'react';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { SharedLedger, UserProfile, SharedTransaction, SharedCategory, SharedTag } from '@/lib/types';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { PageLoader } from '@/components/PageLoader';
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings } from 'lucide-react';
import { AddSharedTransactionSheet } from '@/components/shared-expenses/AddSharedTransactionSheet';
import { SharedTransactionsList } from '@/components/shared-expenses/SharedTransactionsList';

export default function SharedExpenseDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const { user } = useUser();
    const firestore = useFirestore();

    // Fetch the ledger document
    const ledgerRef = useMemoFirebase(() => doc(firestore, 'shared_ledgers', id), [firestore, id]);
    const { data: ledger, isLoading: ledgerLoading } = useDoc<SharedLedger>(ledgerRef);

    // Fetch transactions for this ledger from the top-level collection
    const transactionsQuery = useMemoFirebase(() => 
        query(collection(firestore, 'shared_transactions'), where('ledgerId', '==', id), orderBy('date', 'desc'))
    , [firestore, id]);
    const { data: transactions, isLoading: transactionsLoading } = useCollection<SharedTransaction>(transactionsQuery);

    // Fetch member profiles
    const memberIds = useMemo(() => ledger?.memberIds || [], [ledger]);
    const { data: memberProfiles, isLoading: membersLoading } = useCollection<UserProfile>(
        useMemoFirebase(() => memberIds.length > 0 ? query(collection(firestore, 'users'), where('id', 'in', memberIds)) : null, [firestore, memberIds])
    );
    
    const memberProfileMap = useMemo(() => new Map(memberProfiles?.map(p => [p.id, p])), [memberProfiles]);

    // Fetch shared categories and tags
    const categoriesQuery = useMemoFirebase(() => query(collection(firestore, 'shared_categories'), where('ledgerId', '==', id)), [firestore, id]);
    const { data: categories } = useCollection<SharedCategory>(categoriesQuery);
    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);

    const tagsQuery = useMemoFirebase(() => query(collection(firestore, 'shared_tags'), where('ledgerId', '==', id)), [firestore, id]);
    const { data: tags } = useCollection<SharedTag>(tagsQuery);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);
    
    const enrichedTransactions = useMemo(() => {
        if (!transactions) return [];
        return transactions.map(tx => ({
            ...tx,
            date: (tx.date as any).toDate(),
            createdAt: (tx.createdAt as any).toDate(),
            member: memberProfileMap.get(tx.createdBy),
            category: tx.categoryId ? categoryMap.get(tx.categoryId) : undefined,
            tags: tx.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as SharedTag[] || [],
        }));
    }, [transactions, memberProfileMap, categoryMap, tagMap]);

    const isLoading = ledgerLoading || transactionsLoading || membersLoading;

    if (isLoading) {
        return <PageLoader />;
    }

    if (!ledger) {
        return (
            <PageHeader
                title="Ledger Not Found"
                description="This shared expense ledger could not be found or you don't have access."
            />
        );
    }
    
    const isOwner = ledger.ownerId === user?.uid;

    return (
        <div className="w-full space-y-8">
            <PageHeader title={ledger.name} description={`Shared ledger with ${ledger.memberIds.length} members.`}>
                 {isOwner && (
                    <Button variant="outline">
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Ledger
                    </Button>
                )}
                <AddSharedTransactionSheet ledgerId={id}>
                     <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Transaction
                    </Button>
                </AddSharedTransactionSheet>
            </PageHeader>
            <SharedTransactionsList 
                transactions={enrichedTransactions} 
                isLoading={isLoading} 
                memberProfiles={memberProfiles || []}
                categories={categories || []}
                tags={tags || []}
            />
        </div>
    );
}
