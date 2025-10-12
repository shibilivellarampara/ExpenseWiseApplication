
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Account, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import * as LucideIcons from 'lucide-react';
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc, setDoc } from 'firebase/firestore';
import { Progress } from "../ui/progress";
import { Pilcrow, Edit, CreditCard, Landmark, Trash2, Loader2, MoreVertical, Archive, Eye, EyeOff, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { AddAccountSheet } from "./AddAccountSheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Separator } from "../ui/separator";
import { getCurrencySymbol } from "@/lib/currencies";

interface AccountsListProps {
    accounts: Account[];
    isLoading?: boolean;
}

const renderIcon = (iconName: string | undefined, className?: string) => {
  if (!iconName) return <Pilcrow className={cn("h-6 w-6 text-muted-foreground", className)} />;
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent ? <IconComponent className={cn("h-6 w-6 text-muted-foreground", className)} /> : <Pilcrow className={cn("h-6 w-6 text-muted-foreground", className)} />;
};

function DeactivateAccountButton({ account, onUpdate }: { account: Account, onUpdate: () => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isDeactivating, setIsDeactivating] = useState(false);
    const { toast } = useToast();

    const handleDeactivate = async () => {
        if (!user || !firestore) return;
        setIsDeactivating(true);
        try {
            const accountRef = doc(firestore, `users/${user.uid}/accounts`, account.id);
            await setDoc(accountRef, { status: 'inactive' }, { merge: true });
            
            toast({ title: "Account Deactivated", description: `"${account.name}" has been hidden and can no longer be used.` });
            onUpdate();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsDeactivating(false);
        }
    }
    
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                    <Archive className="mr-2 h-4 w-4" />
                    Deactivate
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to deactivate this account?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will hide the account "{account.name}" from lists and prevent new transactions. You can reactivate it later.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeactivate} className="bg-destructive hover:bg-destructive/90">
                        {isDeactivating ? <Loader2 className="animate-spin" /> : "Deactivate"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function ReactivateAccountButton({ account, onUpdate }: { account: Account, onUpdate: () => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isReactivating, setIsReactivating] = useState(false);
    const { toast } = useToast();

    const handleReactivate = async () => {
        if (!user || !firestore) return;
        setIsReactivating(true);
        try {
            const accountRef = doc(firestore, `users/${user.uid}/accounts`, account.id);
            await setDoc(accountRef, { status: 'active' }, { merge: true });
            toast({ title: "Account Reactivated", description: `"${account.name}" is now active.` });
            onUpdate();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsReactivating(false);
        }
    }

    return (
        <Button variant="ghost" size="sm" onClick={handleReactivate} disabled={isReactivating}>
            {isReactivating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
            Reactivate
        </Button>
    )
}

function InactiveAccountsSection({ accounts, onUpdate, title }: { accounts: Account[], onUpdate: () => void, title: string }) {
    const [isOpen, setIsOpen] = useState(false);

    if (accounts.length === 0) return null;

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
             <Separator />
            <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between p-4 text-sm font-medium text-muted-foreground">
                    <span>View {accounts.length} inactive {title}</span>
                    {isOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 p-4 pt-0">
                {accounts.map(account => (
                    <div key={account.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                             {renderIcon(account.icon, 'h-5 w-5')}
                            <span className="text-muted-foreground">{account.name}</span>
                        </div>
                        <ReactivateAccountButton account={account} onUpdate={onUpdate} />
                    </div>
                ))}
            </CollapsibleContent>
        </Collapsible>
    )
}


export function AccountsList({ accounts: initialAccounts, isLoading }: AccountsListProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);


    const [accounts, setAccounts] = useState(initialAccounts || []);

    // Update state when initialAccounts prop changes
    useEffect(() => {
        setAccounts(initialAccounts || []);
    }, [initialAccounts]);

    const onAccountUpdate = () => {
        // This is a dummy function to trigger a re-render by the parent.
        // A more robust solution might involve a state management library
        // or a callback to the parent to refetch.
        // For now, we rely on the parent component's live query to provide the update.
    };

    const activeAccounts = accounts.filter(acc => (acc.status === 'active' || acc.status === undefined));
    const inactiveAccounts = accounts.filter(acc => acc.status === 'inactive');

    const creditCards = activeAccounts.filter(acc => acc.type === 'credit_card');
    const otherAccounts = activeAccounts.filter(acc => acc.type !== 'credit_card');
    
    const inactiveCreditCards = inactiveAccounts.filter(acc => acc.type === 'credit_card');
    const inactiveOtherAccounts = inactiveAccounts.filter(acc => acc.type !== 'credit_card');


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

    if (initialAccounts && initialAccounts.length === 0) {
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
                             const balance = item.balance; // Outstanding amount
                             const availableCredit = limit - balance;
                             const availablePercentage = limit > 0 ? (availableCredit / limit) * 100 : 0;
                            
                            return (
                                <div key={item.id} className="p-4 flex items-center gap-4 group">
                                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-muted rounded-full">
                                        {renderIcon(item.icon, "h-7 w-7")}
                                    </div>
                                    <div className="flex-grow">
                                        <div className="flex items-center justify-between">
                                            <div className="font-semibold">{item.name}</div>
                                            <div className="font-bold text-lg text-red-500">
                                                {currencySymbol}{balance.toFixed(2)}
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground capitalize">
                                            Outstanding Amount
                                        </p>
                                        {limit > 0 && (
                                            <div className="mt-1">
                                                <Progress value={availablePercentage} className="h-2 [&>div]:bg-green-500" />
                                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                    <span>Available: {currencySymbol}{availableCredit.toFixed(2)}</span>
                                                    <span>Limit: {currencySymbol}{limit.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center ml-auto pl-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <AddAccountSheet accountToEdit={item}>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                </AddAccountSheet>
                                                <DeactivateAccountButton account={item} onUpdate={onAccountUpdate} />
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            )
                        }) : (
                             <p className="text-muted-foreground text-center p-8">No active credit card accounts yet.</p>
                        )}
                    </div>
                </CardContent>
                <InactiveAccountsSection accounts={inactiveCreditCards} onUpdate={onAccountUpdate} title="Credit Cards" />
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
                                        <div className={cn("font-bold text-lg", item.balance >= 0 ? 'text-green-600' : 'text-red-600')}>
                                            {currencySymbol}{item.balance.toFixed(2)}
                                        </div>
                                     </div>
                                    <p className="text-sm text-muted-foreground capitalize">{item.type.replace('_', ' ')}</p>
                                </div>
                                <div className="flex items-center ml-auto pl-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <AddAccountSheet accountToEdit={item}>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                            </AddAccountSheet>
                                            <DeactivateAccountButton account={item} onUpdate={onAccountUpdate} />
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        )) : (
                            <p className="text-muted-foreground text-center p-8">No other active accounts yet.</p>
                        )}
                    </div>
                </CardContent>
                <InactiveAccountsSection accounts={inactiveOtherAccounts} onUpdate={onAccountUpdate} title="Accounts" />
            </Card>
       </div>
    )
}
