
'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Asset, EnrichedAsset, UserProfile, AssetType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc, useFirestore, useUser, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { TrendingUp, Edit, Trash2, Loader2, MoreVertical, PlusCircle, Link as LinkIcon, Info } from 'lucide-react';
import { cn, formatAmount } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getCurrencySymbol } from '@/lib/currencies';
import { AddAssetDialog } from './AddAssetDialog';
import { ASSET_TYPES } from '@/lib/assets';
import { renderIcon } from '@/lib/render-icon';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from "@/components/ui/badge";

interface AssetsListProps {
    assets: Asset[];
    isLoading?: boolean;
}

function DeleteAssetButton({ asset }: { asset: EnrichedAsset }) {
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
            <AlertDialogContent className="rounded-[24px]">
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
            const isTimestamp = (date: any): date is { toDate: () => Date } => {
                return date && typeof date.toDate === 'function';
            };

            return {
                ...a,
                lastUpdated: isTimestamp(a.lastUpdated) ? a.lastUpdated.toDate() : a.lastUpdated as Date,
                startDate: a.startDate && isTimestamp(a.startDate) ? a.startDate.toDate() : a.startDate as Date | undefined,
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
        return <Skeleton className="h-64 rounded-[20px]" />;
    }

    return (
       <div className="grid gap-6">
            {Object.keys(ASSET_TYPES).map(key => {
                const assetType = key as AssetType;
                const categoryAssets = groupedAssets[assetType];
                const categoryInfo = ASSET_TYPES[assetType];
                
                if (!categoryAssets || categoryAssets.length === 0) {
                   return null;
                }

                const categoryTotal = categoryAssets?.reduce((sum, asset) => sum + asset.currentValue, 0) || 0;

                return (
                    <Card key={assetType} className="rounded-[20px] border-none shadow-md bg-card overflow-hidden">
                        <CardHeader className="flex flex-row justify-between items-start pb-4">
                             <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    {renderIcon(categoryInfo.icon, 'h-5 w-5')}
                                </div>
                                <div>
                                    <CardTitle className="font-headline text-lg">{categoryInfo.label}</CardTitle>
                                    <CardDescription className="font-bold text-foreground/80">{currencySymbol}{formatAmount(categoryTotal)}</CardDescription>
                                </div>
                            </div>
                           <div className="flex items-center">
                                {assetType !== 'savings_cash' ? (
                                    <AddAssetDialog initialAssetType={assetType}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary">
                                            <PlusCircle className="h-5 w-5" />
                                        </Button>
                                    </AddAssetDialog>
                                ) : (
                                     <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent className="rounded-xl border shadow-lg bg-card text-card-foreground">
                                                <p className="max-w-[200px] text-xs">This is automatically updated from your active Bank and Cash accounts.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border/50">
                                {categoryAssets.map(asset => {
                                    const gainLoss = asset.currentValue - asset.investedAmount;
                                    const percentageReturn = asset.investedAmount > 0 ? (gainLoss / asset.investedAmount) * 100 : 0;
                                    const isFromAccount = asset.isFromAccount;

                                    return (
                                        <div key={asset.id} className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors group">
                                            <div className="flex-grow min-w-0">
                                                 <div className="font-bold flex items-center gap-2 mb-1">
                                                     {!isFromAccount ? (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                 <span className="cursor-pointer hover:text-primary transition-colors truncate">{asset.name}</span>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="start" className="rounded-xl">
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
                                                        <span className="truncate">{asset.name}</span>
                                                    )}

                                                     {isFromAccount && (
                                                        <Badge variant="outline" className="h-4 text-[8px] uppercase font-bold border-primary/20 text-primary bg-primary/5 px-1 py-0">Linked</Badge>
                                                    )}
                                                </div>
                                                {!isFromAccount && (
                                                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">
                                                        <span>Inv: {currencySymbol}{formatAmount(asset.investedAmount)}</span>
                                                        <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                                        <span>Val: {currencySymbol}{formatAmount(asset.currentValue)}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end shrink-0">
                                                {!isFromAccount ? (
                                                    <>
                                                        <div className={cn("font-bold text-base", gainLoss >= 0 ? 'text-primary' : 'text-destructive')}>
                                                            {gainLoss >= 0 ? '+' : '-'}{currencySymbol}{formatAmount(Math.abs(gainLoss))}
                                                        </div>
                                                        <div className={cn("text-[10px] font-bold flex items-center", gainLoss >= 0 ? 'text-primary' : 'text-destructive')}>
                                                            {percentageReturn.toFixed(1)}%
                                                        </div>
                                                    </>
                                                ) : (
                                                     <div className={cn("font-bold text-base text-primary")}>
                                                        {currencySymbol}{formatAmount(asset.currentValue)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
       </div>
    )
}
