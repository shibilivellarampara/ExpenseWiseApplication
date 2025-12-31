
'use client';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { Asset, UserProfile, Account } from '@/lib/types';
import { collection, orderBy, query, doc } from 'firebase/firestore';
import { AddAssetDialog } from '@/components/assets/AddAssetDialog';
import { AssetsList } from '@/components/assets/AssetsList';
import { useMemo } from 'react';
import { getCurrencySymbol } from '@/lib/currencies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function AssetsPageSkeleton() {
    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64" />
            </div>
        </div>
    );
}

export default function AssetsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const assetsQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/assets`), orderBy('lastUpdated', 'desc')) : null
    , [firestore, user]);

    const accountsQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/accounts`)) : null
    , [firestore, user]);

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);

    const { data: manualAssets, isLoading: assetsLoading } = useCollection<Asset>(assetsQuery);
    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const isLoading = assetsLoading || profileLoading || accountsLoading;
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

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
                lastUpdated: new Date() as any, // This is a client-side representation, so timestamp is for sorting
                isFromAccount: true, // Custom flag to identify these assets
            }));
        
        return [...manualAssets, ...savingsAndCashAccountsAsAssets];
    }, [manualAssets, accounts]);

    const { totalNetAssets, totalInvested, overallGainLoss, overallReturn } = useMemo(() => {
        if (!combinedAssets) return { totalNetAssets: 0, totalInvested: 0, overallGainLoss: 0, overallReturn: 0 };
        const totalNetAssets = combinedAssets.reduce((sum, asset) => sum + asset.currentValue, 0);
        const totalInvested = combinedAssets.reduce((sum, asset) => sum + asset.investedAmount, 0);
        const overallGainLoss = totalNetAssets - totalInvested;
        const overallReturn = totalInvested > 0 ? (overallGainLoss / totalInvested) * 100 : 0;
        return { totalNetAssets, totalInvested, overallGainLoss, overallReturn };
    }, [combinedAssets]);

    return (
        <div className="w-full space-y-8">
            <PageHeader title="Assets" description="A snapshot of your financial holdings.">
                <AddAssetDialog>
                     <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Asset
                    </Button>
                </AddAssetDialog>
            </PageHeader>

            {isLoading ? <AssetsPageSkeleton /> : (
                 <>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Net Assets</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-2xl font-bold">{currencySymbol}{totalNetAssets.toFixed(2)}</div>
                                        <p className="text-xs text-muted-foreground">Total Invested: {currencySymbol}{totalInvested.toFixed(2)}</p>
                                    </div>
                                    <div className={cn(
                                        "flex flex-col items-end text-xs",
                                        overallGainLoss > 0 && "text-green-600",
                                        overallGainLoss < 0 && "text-red-500"
                                    )}>
                                        <div className="flex items-center gap-1 font-semibold">
                                             {overallGainLoss > 0 ? <TrendingUp className="h-4 w-4"/> : overallGainLoss < 0 ? <TrendingDown className="h-4 w-4"/> : null}
                                             <span>({overallReturn.toFixed(2)}%)</span>
                                        </div>
                                        <span>
                                            {overallGainLoss >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(overallGainLoss).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{currencySymbol}{totalInvested.toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground">&nbsp;</p>
                            </CardContent>
                        </Card>
                    </div>

                    <AssetsList assets={combinedAssets || []} />
                 </>
            )}
        </div>
    )
}
