
'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, where } from 'firebase/firestore';
import { SharedExpense, SharedTransaction, UserProfile, EnrichedSharedTransaction } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { SharedTransactionsList } from '@/components/shared-expenses/SharedTransactionsList';
import { AddSharedTransactionSheet } from '@/components/shared-expenses/AddSharedTransactionSheet';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SharedExpenseDetailPage() {
    const params = useParams();
    const ledgerId = params.id as string;
    const { user } = useUser();
    const firestore = useFirestore();

    // Fetch the main ledger document
    const ledgerRef = useMemoFirebase(() => ledgerId ? doc(firestore, 'shared_expenses', ledgerId) : null, [firestore, ledgerId]);
    const { data: ledger, isLoading: ledgerLoading } = useDoc<SharedExpense>(ledgerRef);

    // Fetch transactions for this ledger
    const transactionsQuery = useMemoFirebase(() => ledgerId ? query(collection(firestore, `shared_expenses/${ledgerId}/transactions`), orderBy('date', 'desc')) : null, [ledgerId, firestore]);
    const { data: transactions, isLoading: transactionsLoading } = useCollection<SharedTransaction>(transactionsQuery);

    // Fetch profiles of all members for enrichment
    const memberIds = useMemo(() => ledger?.memberIds || [], [ledger]);
    const { data: memberProfiles, isLoading: membersLoading } = useCollection<UserProfile>(
        useMemoFirebase(() => memberIds.length > 0 ? query(collection(firestore, 'users'), where('id', 'in', memberIds)) : null, [firestore, memberIds])
    );
    
    const memberProfileMap = useMemo(() => new Map(memberProfiles?.map(p => [p.id, p])), [memberProfiles]);

    const enrichedTransactions: EnrichedSharedTransaction[] = useMemo(() => {
        if (!transactions || !memberProfileMap.size) return [];
        return transactions.map(tx => ({
            ...tx,
            date: (tx.date as any).toDate(),
            member: memberProfileMap.get(tx.createdBy),
            tags: [], // Placeholder for now
        }));
    }, [transactions, memberProfileMap]);

    const isLoading = ledgerLoading || transactionsLoading || membersLoading;

    if (isLoading) {
        return (
            <div className="w-full space-y-8">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!ledger) {
        return (
             <div className="w-full space-y-8 text-center">
                <PageHeader title="Ledger Not Found" description="This shared expense ledger could not be found or you don't have access." />
                 <Button variant="outline" asChild>
                    <Link href="/shared-expenses">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Ledgers
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="w-full space-y-8">
            <PageHeader title={ledger.name} description={`Invite Code: ${ledger.inviteCode}`}>
                 <AddSharedTransactionSheet ledgerId={ledgerId}>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Transaction
                    </Button>
                </AddSharedTransactionSheet>
            </PageHeader>
            
            <SharedTransactionsList transactions={enrichedTransactions} isLoading={transactionsLoading} />
        </div>
    )
}
