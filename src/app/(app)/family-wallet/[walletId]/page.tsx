'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { FamilyWallet, FamilyMember, FamilyTransaction, Category, EnrichedFamilyTransaction } from '@/lib/types';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { WalletSummary } from '@/components/family/WalletSummary';
import { WalletTransactionsTable } from '@/components/family/WalletTransactionsTable';
import { WalletHeader } from '@/components/family/WalletHeader';
import { AddWalletTransactionDialog } from '@/components/family/AddWalletTransactionDialog';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function FamilyWalletDetailPage() {
    const { walletId } = useParams() as { walletId: string };
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    // 1. Fetch Wallet and Membership
    const walletRef = useMemoFirebase(() => doc(firestore, 'familyWallets', walletId), [firestore, walletId]);
    const membershipRef = useMemoFirebase(() => user ? doc(firestore, `familyWallets/${walletId}/members`, user.uid) : null, [user, firestore, walletId]);
    
    const { data: wallet, isLoading: walletLoading } = useDoc<FamilyWallet>(walletRef);
    const { data: membership, isLoading: membershipLoading } = useDoc<FamilyMember>(membershipRef);

    // 2. Fetch Transactions & Categories
    const transactionsQuery = useMemoFirebase(() => 
        query(collection(firestore, `familyWallets/${walletId}/transactions`), orderBy('date', 'asc'), orderBy('createdAt', 'asc'))
    , [firestore, walletId]);

    const categoriesQuery = useMemoFirebase(() => 
        collection(firestore, `familyWallets/${walletId}/categories`)
    , [firestore, walletId]);

    const { data: transactions, isLoading: txLoading } = useCollection<FamilyTransaction>(transactionsQuery);
    const { data: categories, isLoading: catLoading } = useCollection<Category>(categoriesQuery);

    const isLoading = walletLoading || membershipLoading || txLoading || catLoading;

    // 3. Process Transactions (Running Balance & Enrichment)
    const processedTransactions = useMemo((): EnrichedFamilyTransaction[] => {
        if (!transactions) return [];
        
        const catMap = new Map(categories?.map(c => [c.id, c]));
        let balance = 0;

        const enriched = transactions.map(tx => {
            const amountChange = tx.type === 'income' ? tx.amount : -tx.amount;
            balance += amountChange;
            
            return {
                ...tx,
                // Handle potential null timestamps during pending writes
                date: tx.date ? (tx.date as any).toDate() : new Date(),
                createdAt: tx.createdAt ? (tx.createdAt as any).toDate() : new Date(),
                category: catMap.get(tx.categoryId),
                runningBalance: balance
            };
        });

        return enriched.reverse(); // Newest at top for UI
    }, [transactions, categories]);

    if (isLoading) {
        return (
            <div className="w-full space-y-6">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-40 w-full rounded-[28px]" />
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!wallet || !membership) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <h3 className="text-xl font-bold">Access Denied</h3>
                <p className="text-muted-foreground">You don't have permission to view this wallet.</p>
                <Button asChild variant="outline">
                    <Link href="/family-wallet">Back to Wallets</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 pb-32">
            <WalletHeader 
                wallet={wallet} 
                membership={membership} 
            />

            <WalletSummary 
                transactions={processedTransactions} 
            />

            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Recent Activity</h3>
                    <AddWalletTransactionDialog walletId={walletId} categories={categories || []}>
                        <Button size="sm" className="h-8 rounded-full px-4 gap-1.5 shadow-lg shadow-primary/20">
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add</span>
                        </Button>
                    </AddWalletTransactionDialog>
                </div>

                <WalletTransactionsTable 
                    transactions={processedTransactions} 
                    walletId={walletId}
                />
            </div>
        </div>
    );
}
