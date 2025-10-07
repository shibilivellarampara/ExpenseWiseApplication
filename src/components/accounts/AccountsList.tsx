
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Account, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import * as LucideIcons from 'lucide-react';
import { getCurrencySymbol } from "@/lib/currencies";
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc, writeBatch, collection, getDocs, query, where } from 'firebase/firestore';
import { Progress } from "../ui/progress";
import { Pilcrow, Edit, CreditCard, Landmark, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { AddAccountSheet } from "./AddAccountSheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AccountsListProps {
    accounts: Account[];
    isLoading?: boolean;
}

const renderIcon = (iconName: string | undefined, className?: string) => {
  if (!iconName) return <Pilcrow className={cn("h-6 w-6 text-muted-foreground", className)} />;
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent ? <IconComponent className={cn("h-6 w-6 text-muted-foreground", className)} /> : <Pilcrow className={cn("h-6 w-6 text-muted-foreground", className)} />;
};

function DeleteAccountButton({ account, onAccountDeleted }: { account: Account, onAccountDeleted: () => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        if (!user || !firestore) return;
        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);

            // 1. Find all transactions associated with this account
            const expensesQuery = query(collection(firestore, `users/${user.uid}/expenses`), where('accountId', '==', account.id));
            const expensesSnapshot = await getDocs(expensesQuery);
            expensesSnapshot.forEach(doc => batch.delete(doc.ref));

            // 2. Delete the account itself
            const accountRef = doc(firestore, `users/${user.uid}/accounts`, account.id);
            batch.delete(accountRef);

            // 3. Commit the batch
            await batch.commit();
            toast({ title: "Account Deleted", description: `"${account.name}" and its transactions have been removed.` });
            onAccountDeleted();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsDeleting(false);
        }
    }
    
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the account "{account.name}" and all of its associated transactions. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <Loader2 className="animate-spin" /> : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function AccountsList({ accounts, isLoading }: AccountsListProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const creditCards = accounts.filter(acc => acc.type === 'credit_card');
    const otherAccounts = accounts.filter(acc => acc.type !== 'credit_card');
    
    const [deletedAccountIds, setDeletedAccountIds] = useState<string[]>([]);
    const visibleAccounts = accounts.filter(acc => !deletedAccountIds.includes(acc.id));


    if (isLoading) {
        return (
            <div className="grid gap-8">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-2">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                                <Skeleton className="h-6 w-1/4" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex items-center gap-4 p-2">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                            <Skeleton className="h-6 w-1/4" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (visibleAccounts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No Accounts Found</h3>
                <p className="text-muted-foreground mt-2">Click "Add Account" to get started.</p>
            </div>
        );
    }
    return (
       <div className="grid gap-8">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                         <CreditCard className="h-7 w-7 text-primary"/>
                        <CardTitle className="font-headline">Credit Cards</CardTitle>
                    </div>
                    <CardDescription>Your credit card accounts and their available limits.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {creditCards.length > 0 ? creditCards.map(item => {
                             const limit = item.limit || 0;
                             const balance = item.balance;
                             const availableCredit = limit - balance;
                             const usagePercentage = limit > 0 ? (availableCredit / limit) * 100 : 0;
                            
                            return (
                                <div key={item.id} className="p-4 flex items-center gap-4 group">
                                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-muted rounded-full">
                                        {renderIcon(item.icon, "h-7 w-7")}
                                    </div>
                                    <div className="flex-grow">
                                        <div className="flex items-center justify-between">
                                            <div className="font-semibold">{item.name}</div>
                                            <div className="font-bold text-lg text-red-500">
                                                {item.balance.toFixed(2)}
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground capitalize">Outstanding Amount</p>
                                        {limit > 0 && (
                                            <div className="mt-1">
                                                <Progress value={usagePercentage} className="h-2" />
                                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                    <span>Available: {availableCredit.toFixed(2)}</span>
                                                    <span>Limit: {limit.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                        <AddAccountSheet accountToEdit={item}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </AddAccountSheet>
                                        <DeleteAccountButton account={item} onAccountDeleted={() => setDeletedAccountIds(prev => [...prev, item.id])} />
                                    </div>
                                </div>
                            )
                        }) : (
                             <p className="text-muted-foreground text-center p-8">No credit card accounts yet.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                     <div className="flex items-center gap-3">
                        <Landmark className="h-7 w-7 text-primary"/>
                        <CardTitle className="font-headline">Savings &amp; Other Accounts</CardTitle>
                    </div>
                    <CardDescription>Your bank, wallet, cash, and other accounts.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {otherAccounts.length > 0 ? otherAccounts.map(item => (
                            <div key={item.id} className="p-4 flex items-center gap-4 group">
                                <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-muted rounded-full">
                                    {renderIcon(item.icon, "h-7 w-7")}
                                </div>
                                <div className="flex-grow">
                                     <div className="flex items-center justify-between">
                                        <div className="font-semibold">{item.name}</div>
                                        <div className="font-bold text-lg">
                                            {item.balance.toFixed(2)}
                                        </div>
                                     </div>
                                    <p className="text-sm text-muted-foreground capitalize">{item.type.replace('_', ' ')}</p>
                                </div>
                                <div className="flex items-center ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                    <AddAccountSheet accountToEdit={item}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </AddAccountSheet>
                                     <DeleteAccountButton account={item} onAccountDeleted={() => setDeletedAccountIds(prev => [...prev, item.id])} />
                                </div>
                            </div>
                        )) : (
                            <p className="text-muted-foreground text-center p-8">No other accounts yet.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
       </div>
    )
}
