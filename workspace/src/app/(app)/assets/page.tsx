'use client';

import { Button } from '@/components/ui/button';
import { PlusCircle, Search, X } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { Asset, UserProfile, Account } from '@/lib/types';
import { collection, orderBy, query, doc } from 'firebase/firestore';
import { AddAssetDialog } from '@/components/assets/AddAssetDialog';
import { AssetsList } from '@/components/assets/AssetsList';
import { AssetsSummary } from '@/components/assets/AssetsSummary';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

function AssetsPageSkeleton() {
    return (
        <div className="space-y-8">
            <div className="h-12 w-full rounded-2xl bg-muted animate-pulse" />
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-[20px]" />
                ))}
            </div>
        </div>
    );
}

export default function AssetsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [searchQuery, setSearchQuery] = useState('');

    const assetsQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/assets`), orderBy('lastUpdated', 'desc')) : null
    , [firestore, user]);

    const accountsQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/accounts`)) : null
    , [firestore, user]);

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);

    const { data: manualAssets, isLoading: assetsLoading } = useCollection<Asset>(assetsQuery);
    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const isLoading = assetsLoading || accountsLoading;

    const combinedAssets = useMemo(() => {
        if (!manualAssets || !accounts) return [];

        const savingsAndCashAccountsAsAssets: Asset[] = accounts
            .filter(acc => acc.type === 'bank' || acc.type === 'cash')
            .map(acc => ({
                id: acc.id,
                userId: acc.userId,
                assetType: 'savings_cash',
                name: acc.name,
                investedAmount: acc.balance,
                currentValue: acc.balance,
                lastUpdated: new Date() as any,
                isFromAccount: true,
            }));
        
        return [...manualAssets, ...savingsAndCashAccountsAsAssets];
    }, [manualAssets, accounts]);

    const filteredAssets = useMemo(() => {
        if (!combinedAssets) return [];
        return combinedAssets.filter(asset => 
            asset.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [combinedAssets, searchQuery]);

    const { totalNetAssets, totalInvested, overallGainLoss, overallReturn } = useMemo(() => {
        if (!combinedAssets || combinedAssets.length === 0) return { totalNetAssets: 0, totalInvested: 0, overallGainLoss: 0, overallReturn: 0 };
        const totalNetAssets = combinedAssets.reduce((sum, asset) => sum + asset.currentValue, 0);
        const totalInvested = combinedAssets.reduce((sum, asset) => sum + asset.investedAmount, 0);
        const overallGainLoss = totalNetAssets - totalInvested;
        const overallReturn = totalInvested > 0 ? (overallGainLoss / totalInvested) * 100 : 0;
        return { totalNetAssets, totalInvested, overallGainLoss, overallReturn };
    }, [combinedAssets]);

    return (
        <div className="w-full space-y-6 pb-32">
            <AssetsSummary 
                totalNetAssets={totalNetAssets}
                totalInvested={totalInvested}
                overallGainLoss={overallGainLoss}
                overallReturn={overallReturn}
                isLoading={isLoading}
                currency={userProfile?.defaultCurrency}
            />

            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search assets..."
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
                <AddAssetDialog>
                     <Button className="h-12 px-6 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-2xl shadow-none gap-2 shrink-0">
                        <PlusCircle className="h-5 w-5" />
                        <span className="hidden sm:inline">Add Asset</span>
                        <span className="sm:hidden">Add</span>
                    </Button>
                </AddAssetDialog>
            </div>

            {isLoading ? <AssetsPageSkeleton /> : (
                <AssetsList assets={filteredAssets} />
            )}
        </div>
    )
}
