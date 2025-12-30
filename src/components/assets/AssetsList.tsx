
'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Asset, EnrichedAsset, UserProfile, AssetType } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { useDoc, useFirestore, useUser, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { TrendingUp, Edit, Trash2, Loader2, MoreVertical, PlusCircle, Link as LinkIcon, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { getCurrencySymbol } from '@/lib/currencies';
import { AddAssetDialog } from './AddAssetDialog';
import { ASSET_TYPES } from '@/lib/assets';
import { renderIcon } from '@/lib/render-icon';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface AssetsListProps {
    assets: Asset[];
    isLoading?: boolean;
}

function DeleteAssetButton({ asset }: { asset: Asset }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const handleAssetDelete = async () => {
        if (!user || !firestore) return;
        setIsDeleting(true);
        try {
            const assetRef = doc(firestore, `users/${user.uid}/assets`, asset.id);
            await deleteDocumentNonBlocking(assetRef);
            toast({ title: "Asset Deleted", description: `"${asset.name}" has been permanently deleted.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error Deleting Asset", description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the asset "{asset.name}". This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAssetDelete} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <Loader2 className="animate-spin" /> : "Yes, delete asset"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function AssetsList({ assets, isLoading }: AssetsListProps) {
    const { user } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    const enrichedAssets = useMemo(() => {
        if (!assets) return [];
        return assets.map(a => {
            // Helper to check if it's a Firestore Timestamp
            const isTimestamp = (date: any): date is { toDate: () => Date } => {
                return date && typeof date.toDate === 'function';
            };

            return {
                ...a,
                lastUpdated: isTimestamp(a.lastUpdated) ? a.lastUpdated.toDate() : a.lastUpdated as Date,
                startDate: a.startDate && isTimestamp(a.startDate) ? a.startDate.toDate() : a.startDate as Date | undefined,
                maturityDate: a.maturityDate && isTimestamp(a.maturityDate) ? a.maturityDate.toDate() : a.maturityDate as Date | undefined,
            }
        }) as EnrichedAsset[];
    }, [assets]);

    const groupedAssets = useMemo(() => {
        const groups: { [key in AssetType]?: EnrichedAsset[] } = {};
        for (const asset of enrichedAssets) {
            if (!groups[asset.assetType]) {
                groups[asset.assetType] = [];
            }
            groups[asset.assetType]?.push(asset);
        }
        return groups;
    }, [enrichedAssets]);

    if (isLoading) {
        return <Skeleton className="h-64" />;
    }

    if (!assets || assets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No Assets Found</h3>
                <p className="text-muted-foreground mt-2">Click "Add Asset" to start tracking your financial holdings.</p>
                 <AddAssetDialog>
                    <Button className="mt-4">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Your First Asset
                    </Button>
                </AddAssetDialog>
            </div>
        );
    }
    return (
       <div className="grid gap-6">
            {Object.keys(ASSET_TYPES).map(key => {
                const assetType = key as AssetType;
                const categoryAssets = groupedAssets[assetType];
                const categoryInfo = ASSET_TYPES[assetType];
                
                const isSavingsCategory = assetType === 'savings_cash';
                const hasManualSavingsAssets = categoryAssets?.some(a => !a.isFromAccount);

                if (!categoryAssets || categoryAssets.length === 0) {
                    if (!isSavingsCategory) return null; // Don't render card if no assets and not savings
                }

                const categoryTotal = categoryAssets?.reduce((sum, asset) => sum + asset.currentValue, 0) || 0;

                return (
                    <Card key={assetType}>
                        <CardHeader className="flex flex-row justify-between items-start">
                            <div className="flex items-center gap-3">
                                {renderIcon(categoryInfo.icon, 'h-6 w-6 text-primary')}
                                <div>
                                    <CardTitle className="font-headline">{categoryInfo.label}</CardTitle>
                                    <CardDescription>{currencySymbol}{categoryTotal.toFixed(2)}</CardDescription>
                                </div>
                            </div>
                             {assetType !== 'savings_cash' && (
                                 <AddAssetDialog initialAssetType={assetType}>
                                    <Button variant="ghost" size="sm">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add
                                    </Button>
                                </AddAssetDialog>
                             )}
                              {isSavingsCategory && !hasManualSavingsAssets && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">This is automatically updated from your Bank and Cash accounts. To add a new account, go to the Accounts page.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </CardHeader>
                        <CardContent className="p-0">
                            {categoryAssets && categoryAssets.length > 0 ? (
                                <div className="divide-y">
                                    {categoryAssets.map(asset => {
                                        const gainLoss = asset.currentValue - asset.investedAmount;
                                        const percentageReturn = asset.investedAmount > 0 ? (gainLoss / asset.investedAmount) * 100 : 0;
                                        const isFromAccount = asset.isFromAccount;

                                        return (
                                            <div key={asset.id} className="p-4 flex items-start gap-4 group">
                                                <div className="flex-grow space-y-1">
                                                    <div className="font-semibold flex items-center gap-2">
                                                        {asset.name}
                                                         {isFromAccount && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <LinkIcon className="h-3 w-3 text-muted-foreground" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Linked to Account</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </div>
                                                    {!isFromAccount && (
                                                        <div className="flex items-center gap-4 text-sm">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-muted-foreground">Current Value</span>
                                                                <span className="font-medium">{currencySymbol}{asset.currentValue.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-muted-foreground">Invested</span>
                                                                <span className="font-medium text-muted-foreground">{currencySymbol}{asset.investedAmount.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    {!isFromAccount ? (
                                                        <>
                                                            <div className={cn("font-bold text-lg", gainLoss >= 0 ? 'text-green-600' : 'text-red-500')}>
                                                                {gainLoss >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(gainLoss).toFixed(2)}
                                                            </div>
                                                            <div className={cn("text-xs flex items-center", gainLoss >= 0 ? 'text-green-600' : 'text-red-500')}>
                                                                <TrendingUp className="h-3 w-3 mr-1" />
                                                                ({percentageReturn.toFixed(2)}%)
                                                            </div>
                                                        </>
                                                    ) : (
                                                         <div className={cn("font-bold text-lg", asset.currentValue >= 0 ? 'text-green-600' : 'text-red-500')}>
                                                            {currencySymbol}{asset.currentValue.toFixed(2)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center ml-auto pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!isFromAccount ? (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <AddAssetDialog assetToEdit={asset}>
                                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                        <Edit className="mr-2 h-4 w-4" />
                                                                        Edit
                                                                    </DropdownMenuItem>
                                                                </AddAssetDialog>
                                                                <DeleteAssetButton asset={asset} />
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    ) : (
                                                        <div className="w-8 h-8"></div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No assets in this category yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )
            })}
       </div>
    )
}
