'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Account, UserProfile } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import * as LucideIcons from 'lucide-react';
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking, commitBatchNonBlocking } from "@/firebase";
import { doc, writeBatch, collection, getDocs, query, where } from 'firebase/firestore';
import { Progress } from "@/components/ui/progress";
import { Pilcrow, Edit, MoreVertical, Archive, Eye, EyeOff, RotateCw, History, XCircle, BarChartHorizontal, Handshake, CreditCard, Landmark, Loader2 } from "lucide-react";
import { cn, formatAmount } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AddAccountSheet } from "./AddAccountSheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { getCurrencySymbol } from "@/lib/currencies";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogHeader, DialogTitle, DialogContent, DialogDescription } from "@/components/ui/dialog";
import Image from "next/image";
import { PayBillDialog } from "@/components/accounts/PayBillDialog";
import { renderIcon } from '@/lib/render-icon';

interface AccountsListProps {
    accounts: Account[];
    isLoading?: boolean;
    searchActive?: boolean;
}

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
            const expensesQuery = query(collection(firestore, `users/${user.uid}/expenses`), where('accountId', '==', account.id));
            const expensesSnapshot = await getDocs(expensesQuery);
            expensesSnapshot.forEach(doc => batch.delete(doc.ref));

            const accountRef = doc(firestore, `users/${user.uid}/accounts`, account.id);
            batch.delete(accountRef);

            await commitBatchNonBlocking(batch, `users/${user.uid}/accounts`);
            
            toast({
                title: "Account Closed",
                description: `"${account.name}" and all its transactions have been permanently deleted.`
            });
        } catch (error: any) {
             toast({ variant: 'destructive', title: "Error Closing Account", description: error.message });
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
            <AlertDialogContent className="rounded-[24px]">
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the account "{account.name}" and all of its associated transactions. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAccountDelete} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <Loader2 className="animate-spin" /> : "Yes, close account"}
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
        toast({ title: "Account Deactivated", description: `"${account.name}" has been archived.` });
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
            <AlertDialogContent className="rounded-[24px]">
                <AlertDialogHeader>
                    <AlertDialogTitle>Deactivate Account?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will hide the account "{account.name}" from forms and lists. You can reactivate it later from the settings.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeactivate}>
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
        <Button variant="ghost" size="sm" onClick={handleReactivate} disabled={isReactivating} className="text-primary hover:bg-primary/10 rounded-xl">
            {isReactivating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
            Reactivate
        </Button>
    )
}

function InactiveAccountsSection({ accounts, title }: { accounts: Account[], title: string }) {
    const [isOpen, setIsOpen] = useState(false);

    if (accounts.length === 0) return null;

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
            <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-primary transition-colors">
                    <span>{accounts.length} Inactive {title}</span>
                    {isOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 px-2 pb-4">
                {accounts.map(account => (
                    <div key={account.id} className="flex items-center justify-between p-3 rounded-[16px] bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center opacity-60">
                                {renderIcon(account.icon, 'h-4 w-4')}
                             </div>
                            <span className="text-sm font-medium text-muted-foreground">{account.name}</span>
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
        <div className="w-full max-w-sm mx-auto rounded-[20px] bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-2xl relative overflow-hidden">
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
                        <p className="font-light tracking-wider text-primary-foreground/70 uppercase">Card Holder</p>
                        <p className="font-medium tracking-wide">{details?.cardholderName || 'N/A'}</p>
                    </div>
                     <div className="text-sm text-right">
                        <p className="font-light tracking-wider text-primary-foreground/70 uppercase">Expires</p>
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

export function AccountsList({ accounts, isLoading, searchActive }: AccountsListProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    const { activeCreditCards, inactiveCreditCards, activeOtherAccounts, inactiveOtherAccounts } = useMemo(() => {
        const active = accounts.filter(acc => acc.status === 'active' || acc.status === undefined);
        const inactive = accounts.filter(acc => acc.status === 'inactive');

        return {
            activeCreditCards: active.filter(acc => acc.type === 'credit_card'),
            inactiveCreditCards: inactive.filter(acc => acc.type === 'credit_card'),
            activeOtherAccounts: active.filter(acc => acc.type !== 'credit_card'),
            inactiveOtherAccounts: inactive.filter(acc => acc.type !== 'credit_card'),
        };
    }, [accounts]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-[20px]" />
                ))}
            </div>
        )
    }

    if (accounts.length === 0 && !searchActive) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-[20px] bg-card/50">
                <h3 className="text-xl font-semibold">No Accounts Found</h3>
                <p className="text-muted-foreground mt-2">Click "Add Account" to get started.</p>
            </div>
        );
    }

    const renderAccountCard = (item: Account, isFeatured: boolean = false) => {
        const isCreditCard = item.type === 'credit_card';
        const limit = item.limit || 0;
        const available = item.balance;
        const outstanding = Math.round((limit > 0 ? limit - available : -available) * 100) / 100;
        const isPaid = outstanding <= 0;
        const availablePercent = limit > 0 ? (available / limit) * 100 : 0;

        return (
            <Card 
                key={item.id} 
                className={cn(
                    "rounded-[20px] border border-border/50 transition-all duration-300 bg-card overflow-hidden group",
                    isFeatured 
                        ? "shadow-[0_8px_24px_rgba(0,0,0,0.08),0_-8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)] -translate-y-0.5 z-10" 
                        : "shadow-md hover:shadow-lg"
                )}
            >
                <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            {isCreditCard ? (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                                            {renderIcon(item.icon, "h-6 w-6")}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="rounded-[24px]">
                                        <DialogHeader>
                                            <DialogTitle>Card Details</DialogTitle>
                                            <DialogDescription>Non-sensitive card information.</DialogDescription>
                                        </DialogHeader>
                                        <CardDisplay account={item} />
                                    </DialogContent>
                                </Dialog>
                            ) : (
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                    {renderIcon(item.icon, "h-6 w-6")}
                                </div>
                            )}
                        </div>

                        <div className="flex-grow min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <div className="min-w-0">
                                    <h3 
                                        className="font-bold text-base truncate cursor-pointer active:text-primary transition-colors"
                                        onClick={() => window.location.href=`/expenses?accounts=${item.id}`}
                                    >
                                        {item.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {isCreditCard && item.billingDate 
                                            ? `${outstanding > 0 ? 'Due' : 'Next bill'}: ${item.billingDate}${getOrdinalSuffix(item.billingDate)}`
                                            : item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-right">
                                        {isCreditCard ? (
                                            isPaid ? (
                                                <Badge className="bg-primary/10 text-primary border-none font-bold">Paid</Badge>
                                            ) : (
                                                <p className="font-bold text-lg text-destructive leading-none">
                                                    {currencySymbol}{formatAmount(outstanding)}
                                                </p>
                                            )
                                        ) : (
                                            <p className={cn("font-bold text-lg leading-none", item.balance >= 0 ? "text-primary" : "text-destructive")}>
                                                {currencySymbol}{formatAmount(item.balance)}
                                            </p>
                                        )}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground focus-visible:ring-0">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl">
                                            <AddAccountSheet accountToEdit={item}>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                            </AddAccountSheet>
                                            {isCreditCard && (
                                                <PayBillDialog 
                                                    creditCard={item} 
                                                    paymentAccounts={activeOtherAccounts.filter(a => a.type === 'bank')} 
                                                    outstandingAmount={outstanding}
                                                >
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={outstanding <= 0} className={!isPaid ? "text-primary" : ""}>
                                                        <Handshake className="mr-2 h-4 w-4" /> Pay Bill
                                                    </DropdownMenuItem>
                                                </PayBillDialog>
                                            )}
                                            <DropdownMenuItem asChild>
                                                <Link href={`/analysis?accounts=${item.id}`}>
                                                    <BarChartHorizontal className="mr-2 h-4 w-4" /> Analysis
                                                </Link>
                                            </DropdownMenuItem>
                                            {isCreditCard && (
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/expenses?accounts=${item.id}&type=income`}>
                                                        <History className="mr-2 h-4 w-4" /> Payment History
                                                    </Link>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DeactivateAccountButton account={item} />
                                            <CloseAccountButton account={item} />
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {isCreditCard && limit > 0 && (
                                <div className="mt-3 space-y-1.5">
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-primary to-primary/30 transition-all duration-500 rounded-full"
                                            style={{ width: `${Math.min(100, availablePercent)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">
                                        <span>Limit: {currencySymbol}{formatAmount(limit)}</span>
                                        <span>Avail: {currencySymbol}{formatAmount(available)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-8">
            {/* Active Credit Cards Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <div>
                        <h2 className="text-xl font-bold font-headline">Credit Cards</h2>
                    </div>
                    {activeCreditCards.length > 0 && (
                        <div className="text-right">
                            <p className="text-xl font-bold text-destructive">
                                {currencySymbol}{formatAmount(activeCreditCards.reduce((sum, c) => sum + Math.max(0, (c.limit || 0) - c.balance), 0))}
                            </p>
                        </div>
                    )}
                </div>
                <div className="grid gap-4">
                    {activeCreditCards.map((card, idx) => renderAccountCard(card, idx === 0))}
                    {activeCreditCards.length === 0 && !isLoading && (
                        <p className="text-sm text-muted-foreground/60 text-center py-4 bg-muted/10 rounded-[20px] border border-dashed">No active credit cards</p>
                    )}
                </div>
                <InactiveAccountsSection accounts={inactiveCreditCards} title="Credit Cards" />
            </div>

            {/* Active Savings & Others Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-xl font-bold font-headline">Savings & Others</h2>
                    {activeOtherAccounts.length > 0 && (
                        <p className="text-xl font-bold text-primary">
                            {currencySymbol}{formatAmount(activeOtherAccounts.reduce((sum, c) => sum + c.balance, 0))}
                        </p>
                    )}
                </div>
                <div className="grid gap-4">
                    {activeOtherAccounts.map((account) => renderAccountCard(account))}
                    {activeOtherAccounts.length === 0 && !isLoading && (
                        <p className="text-sm text-muted-foreground/60 text-center py-4 bg-muted/10 rounded-[20px] border border-dashed">No active savings accounts</p>
                    )}
                </div>
                <InactiveAccountsSection accounts={inactiveOtherAccounts} title="Accounts" />
            </div>
        </div>
    );
}
