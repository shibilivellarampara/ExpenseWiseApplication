

'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Account, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import * as LucideIcons from 'lucide-react';
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking, commitBatchNonBlocking } from "@/firebase";
import { doc, setDoc, writeBatch, collection, getDocs, query, where } from 'firebase/firestore';
import { Progress } from "../ui/progress";
import { Pilcrow, Edit, CreditCard, Landmark, Trash2, Loader2, MoreVertical, Archive, Eye, EyeOff, RotateCw, CalendarDays, History, XCircle, Merge, BarChartHorizontal, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { AddAccountSheet } from "./AddAccountSheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Separator } from "../ui/separator";
import { getCurrencySymbol } from "@/lib/currencies";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { Dialog, DialogTrigger, DialogHeader, DialogTitle, DialogContent, DialogDescription } from "../ui/dialog";
import Image from "next/image";
import { PayBillDialog } from "./PayBillDialog";

interface AccountsListProps {
    accounts: Account[];
    isLoading?: boolean;
}

const renderIcon = (iconName: string | undefined, className?: string) => {
  if (!iconName) return <Pilcrow className={cn("h-6 w-6 text-muted-foreground", className)} />;
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent ? <IconComponent className={cn("h-6 w-6 text-muted-foreground", className)} /> : <Pilcrow className={cn("h-6 w-6 text-muted-foreground", className)} />;
};

// Helper function to get the ordinal suffix for a day
const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1:  return "st";
      case 2:  return "nd";
      case 3:  return "rd";
      default: return "th";
    }
};

function CloseAccountButton({ account }: { account: Account }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const handleAccountDelete = async () => {
        if (!user || !firestore) return;
        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            
            // Query for all transactions associated with the account
            const expensesQuery = query(collection(firestore, `users/${user.uid}/expenses`), where('accountId', '==', account.id));
            const expensesSnapshot = await getDocs(expensesQuery);
            expensesSnapshot.forEach(doc => batch.delete(doc.ref));

            // Delete the account itself
            const accountRef = doc(firestore, `users/${user.uid}/accounts`, account.id);
            batch.delete(accountRef);

            await commitBatchNonBlocking(batch, `users/${user.uid}/accounts`);
            
            toast({
                title: "Account Closed",
                description: `"${account.name}" and all its transactions have been permanently deleted.`
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: "Error Closing Account",
                description: error.message
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                    <XCircle className="mr-2 h-4 w-4" />
                    Close Account
                </DropdownMenuItem>
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
                    <AlertDialogAction onClick={handleAccountDelete} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <Loader2 className="animate-spin" /> : "Yes, close this account"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function DeactivateAccountButton({ account }: { account: Account }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isDeactivating, setIsDeactivating] = useState(false);
    const { toast } = useToast();

    const handleDeactivate = async () => {
        if (!user || !firestore) return;
        setIsDeactivating(true);
        const accountRef = doc(firestore, `users/${user.uid}/accounts`, account.id);
        setDocumentNonBlocking(accountRef, { status: 'inactive' }, { merge: true });
        toast({ title: "Account Deactivated", description: `"${account.name}" has been hidden and can no longer be used.` });
        setIsDeactivating(false);
    }
    
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
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

function ReactivateAccountButton({ account }: { account: Account }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isReactivating, setIsReactivating] = useState(false);
    const { toast } = useToast();

    const handleReactivate = async () => {
        if (!user || !firestore) return;
        setIsReactivating(true);
        const accountRef = doc(firestore, `users/${user.uid}/accounts`, account.id);
        setDocumentNonBlocking(accountRef, { status: 'active' }, { merge: true });
        toast({ title: "Account Reactivated", description: `"${account.name}" is now active.` });
        setIsReactivating(false);
    }

    return (
        <Button variant="ghost" size="sm" onClick={handleReactivate} disabled={isReactivating}>
            {isReactivating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
            Reactivate
        </Button>
    )
}

function InactiveAccountsSection({ accounts, title }: { accounts: Account[], title: string }) {
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
                        <ReactivateAccountButton account={account} />
                    </div>
                ))}
            </CollapsibleContent>
        </Collapsible>
    )
}


const CardDisplay = ({ account }: { account: Account }) => {
    const details = account.cardDetails;
    const network = details?.network || 'other';

    return (
        <div className="w-full max-w-sm mx-auto rounded-xl bg-gradient-to-br from-primary/80 to-primary/60 p-6 text-primary-foreground shadow-2xl relative overflow-hidden">
            <div className="absolute top-4 right-4 h-10 w-16">
                 <Image src={`/card-networks/${network}.svg`} alt={network} width={64} height={40} className="object-contain" />
            </div>
            <div className="absolute -bottom-16 -right-16 w-32 h-32 rounded-full bg-white/10"></div>
            <div className="absolute -top-8 -left-12 w-24 h-24 rounded-full bg-white/5"></div>

            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold tracking-wider">{details?.cardNickname || account.name}</span>
                </div>
                <div className="text-center font-mono text-2xl tracking-widest">
                    <span>•••• •••• •••• {details?.last4Digits || '••••'}</span>
                </div>
                <div className="flex justify-between items-end">
                    <div className="text-sm">
                        <p className="font-light tracking-wider">Card Holder</p>
                        <p className="font-medium tracking-wide">{details?.cardholderName || 'N/A'}</p>
                    </div>
                     <div className="text-sm text-right">
                        <p className="font-light tracking-wider">Expires</p>
                        <p className="font-medium tracking-wide">
                            {details?.expiryMonth && details?.expiryYear ? 
                                `${String(details.expiryMonth).padStart(2, '0')}/${String(details.expiryYear).slice(-2)}`
                                : 'MM/YY'
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}


export function AccountsList({ accounts, isLoading }: AccountsListProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    const activeAccounts = accounts.filter(acc => (acc.status === 'active' || acc.status === undefined));
    const inactiveAccounts = accounts.filter(acc => acc.status === 'inactive');

    const creditCards = activeAccounts.filter(acc => acc.type === 'credit_card');

    const otherAccounts = useMemo(() => {
        const other = activeAccounts.filter(acc => acc.type !== 'credit_card');
        const typeOrder = { 'bank': 1, 'wallet': 2, 'cash': 3 };
        return other.sort((a, b) => {
            const orderA = typeOrder[a.type as keyof typeof typeOrder] || 4;
            const orderB = typeOrder[b.type as keyof typeof typeOrder] || 4;
            return orderA - orderB;
        });
    }, [activeAccounts]);

    const { totalOutstanding, totalAvailableCredit } = useMemo(() => {
        const outstanding = creditCards.reduce((sum, card) => sum + ((card.limit || 0) - card.balance), 0);
        const available = creditCards.reduce((sum, card) => sum + card.balance, 0);
        return { totalOutstanding: outstanding, totalAvailableCredit: available };
    }, [creditCards]);

    const totalSavingsBalance = useMemo(() => {
        return otherAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    }, [otherAccounts]);
    
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

    if (accounts && accounts.length === 0) {
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
                 <CardHeader className="flex flex-row items-start justify-between border-b">
                    <div className="flex items-center gap-3">
                        <CreditCard className="h-7 w-7 text-primary"/>
                        <div>
                            <CardTitle className="font-headline">Credit Cards</CardTitle>
                        </div>
                    </div>
                     <div className="text-right">
                        <p className="font-bold text-xl text-destructive">{currencySymbol}{totalOutstanding.toFixed(2)}</p>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {creditCards.length > 0 ? creditCards.map((item) => {
                            const limit = item.limit || 0;
                            const availableCredit = item.balance;
                            const outstandingAmount = Math.round((limit > 0 ? limit - availableCredit : -availableCredit) * 100) / 100;
                            const isPaid = outstandingAmount <= 0;
                            const availablePercentage = limit > 0 && limit > outstandingAmount ? ((limit - outstandingAmount) / limit) * 100 : 0;
                            
                            return (
                                <div key={item.id} className="p-4 group">
                                    <div className="flex items-start gap-4">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-muted flex-shrink-0 cursor-pointer">
                                                    {renderIcon(item.icon, "h-5 w-5")}
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Card Details</DialogTitle>
                                                    <DialogDescription>Non-sensitive card information.</DialogDescription>
                                                </DialogHeader>
                                                <CardDisplay account={item} />
                                            </DialogContent>
                                        </Dialog>

                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between items-start">
                                                <Link href={`/expenses?accounts=${item.id}`} className="font-semibold truncate transition-transform active:scale-95">
                                                    {item.name}
                                                </Link>
                                                <div className="flex items-center gap-1 flex-shrink-0 ml-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                                    <div className="text-right">
                                                        {isPaid ? (
                                                            <Badge className="bg-primary/10 text-primary text-sm">Paid</Badge>
                                                        ) : (
                                                            <div className={cn("font-semibold text-lg text-destructive")}>
                                                                {`${currencySymbol}${outstandingAmount.toFixed(2)}`}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 focus-visible:ring-0 focus-visible:ring-offset-0">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <AddAccountSheet accountToEdit={item}>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                                </DropdownMenuItem>
                                                            </AddAccountSheet>
                                                            <PayBillDialog creditCard={item} paymentAccounts={otherAccounts.filter(a => a.type === 'bank')} outstandingAmount={outstandingAmount}>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={outstandingAmount <= 0} className={outstandingAmount > 0 ? 'text-primary' : ''}>
                                                                    <Handshake className="mr-2 h-4 w-4" /> Pay Bill
                                                                </DropdownMenuItem>
                                                            </PayBillDialog>
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/analysis?accounts=${item.id}`}>
                                                                    <BarChartHorizontal className="mr-2 h-4 w-4" /> Go to Analysis
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/expenses?accounts=${item.id}&type=income`}>
                                                                    <History className="mr-2 h-4 w-4" /> Payment History
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DeactivateAccountButton account={item} />
                                                            <CloseAccountButton account={item} />
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {item.billingDate ? 
                                                    <span>
                                                        Due: {`${item.billingDate}${getOrdinalSuffix(item.billingDate)}`}
                                                    </span> 
                                                : <span>No billing date set</span>}
                                            </div>
                                            {limit > 0 && (
                                                <div className="space-y-1 pt-0.5">
                                                    <Progress value={availablePercentage} className="h-1.5" />
                                                    <div className="flex justify-between text-xs text-muted-foreground">
                                                        <span>Limit: {currencySymbol}{limit.toFixed(2)}</span>
                                                        <span>Available: {currencySymbol}{availableCredit.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        }) : (
                             <p className="text-muted-foreground text-center p-8">No active credit card accounts yet.</p>
                        )}
                    </div>
                </CardContent>
                <InactiveAccountsSection accounts={inactiveCreditCards} title="Credit Cards" />
            </Card>

             <Card>
                <CardHeader>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Landmark className="h-7 w-7 text-primary"/>
                            <CardTitle className="font-headline">Savings &amp; Others</CardTitle>
                        </div>
                        <div className="flex items-center text-lg font-bold text-primary">
                             <span>{currencySymbol}{totalSavingsBalance.toFixed(2)}</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {otherAccounts.length > 0 ? otherAccounts.map((item) => (
                            <Link key={item.id} href={`/expenses?accounts=${item.id}`} passHref>
                            <div className="p-4 flex items-center gap-4 group transition-colors hover:bg-accent/50 cursor-pointer">
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                {renderIcon(item.icon, "h-5 w-5")}
                                </div>
                                <div className="flex-grow">
                                        <span className="font-semibold">{item.name}</span>
                                    <Badge variant="secondary" className="capitalize text-xs">{item.type.replace('_', ' ')}</Badge>
                                </div>
                                <div className="flex items-center gap-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                    <div className={cn(
                                        "font-bold text-base",
                                        item.balance >= 0 ? "text-primary" : "text-destructive"
                                    )}>
                                        {currencySymbol}{item.balance.toFixed(2)}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 focus-visible:ring-0 focus-visible:ring-offset-0">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <AddAccountSheet accountToEdit={item}>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                            </AddAccountSheet>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/analysis?accounts=${item.id}`}>
                                                    <BarChartHorizontal className="mr-2 h-4 w-4" /> Go to Analysis
                                                </Link>
                                            </DropdownMenuItem>
                                            <DeactivateAccountButton account={item} />
                                            <CloseAccountButton account={item} />
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            </Link>
                        )) : (
                            <p className="text-muted-foreground text-center p-8">No other active accounts yet.</p>
                        )}
                    </div>
                </CardContent>
                <InactiveAccountsSection accounts={inactiveOtherAccounts} title="Accounts" />
            </Card>
       </div>
    )
}
