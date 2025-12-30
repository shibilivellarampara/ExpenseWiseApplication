
'use client';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { Asset, UserProfile } from '@/lib/types';
import { collection, orderBy, query, doc } from 'firebase/firestore';
import { AddAssetDialog } from '@/components/assets/AddAssetDialog';
import { AssetsList } from '@/components/assets/AssetsList';
import { useMemo } from 'react';
import { getCurrencySymbol } from '@/lib/currencies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function AssetsPageSkeleton() {
    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
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

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);

    const { data: assets, isLoading: assetsLoading } = useCollection<Asset>(assetsQuery);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const isLoading = assetsLoading || profileLoading;
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    const { totalNetAssets, totalInvested, overallGainLoss, overallReturn } = useMemo(() => {
        if (!assets) return { totalNetAssets: 0, totalInvested: 0, overallGainLoss: 0, overallReturn: 0 };
        const totalNetAssets = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
        const totalInvested = assets.reduce((sum, asset) => sum + asset.investedAmount, 0);
        const overallGainLoss = totalNetAssets - totalInvested;
        const overallReturn = totalInvested > 0 ? (overallGainLoss / totalInvested) * 100 : 0;
        return { totalNetAssets, totalInvested, overallGainLoss, overallReturn };
    }, [assets]);

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
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Net Assets</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{currencySymbol}{totalNetAssets.toFixed(2)}</div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{currencySymbol}{totalInvested.toFixed(2)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Overall Gain/Loss</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${overallGainLoss >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {overallGainLoss >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(overallGainLoss).toFixed(2)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Overall Return</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${overallReturn >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {overallReturn.toFixed(2)}%
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <AssetsList assets={assets || []} />
                 </>
            )}
        </div>
    )
}
