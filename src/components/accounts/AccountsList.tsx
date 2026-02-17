
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Account, UserProfile } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import * as LucideIcons from 'lucide-react';
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking, commitBatchNonBlocking } from "@/firebase";
import { doc, writeBatch, collection, getDocs, query, where } from 'firebase/firestore';
import { Progress } from "@/components/ui/progress";
import { Pilcrow, Edit, MoreVertical, Archive, Eye, EyeOff, RotateCw, History, XCircle, BarChartHorizontal, Handshake, CreditCard, Landmark } from "lucide-react";
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

interface AccountsListProps {
    accounts: Account[];
    isLoading?: boolean;
    searchActive?: boolean;
}

const renderIcon = (iconName: string | undefined, className?: string) => {
  if (!iconName) return <Pilcrow className={cn("h-6 w-6 text-muted-foreground", className)} />;
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent ? <IconComponent className={cn("h-6 w-6 text-muted-foreground", className)} /> : <Pilcrow className={cn("h-6 w-6 text-muted-foreground", className)} />;
};

const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1:  return "st";
      case 2:  return "nd";
      case 3:  return "rd";
      default: return "th";
    }
};

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

    const activeAccounts = accounts.filter(acc => (acc.status === 'active' || acc.status === undefined));
    const inactiveAccounts = accounts.filter(acc => acc.status === 'inactive');

    const creditCards = activeAccounts.filter(acc => acc.type === 'credit_card');
    const otherAccounts = activeAccounts.filter(acc => acc.type !== 'credit_card');

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

    const renderAccountCard = (item: Account) => {
        const isCreditCard = item.type === 'credit_card';
        const limit = item.limit || 0;
        const available = item.balance;
        const outstanding = Math.round((limit > 0 ? limit - available : -available) * 100) / 100;
        const isPaid = outstanding <= 0;
        const usagePercent = limit > 0 ? (outstanding / limit) * 100 : 0;

        return (
            <Card key={item.id} className="rounded-[20px] border-none shadow-sm hover:shadow-md transition-all duration-300 bg-card overflow-hidden group">
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
                                        className="font-bold text-base truncate cursor-pointer hover:text-primary transition-colors"
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
                                                <Badge className="bg-[#2F80ED]/10 text-[#2F80ED] border-none font-bold">Paid</Badge>
                                            ) : (
                                                <p className="font-bold text-lg text-[#F2994A] leading-none">
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
                                                    paymentAccounts={otherAccounts.filter(a => a.type === 'bank')} 
                                                    outstandingAmount={outstanding}
                                                >
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={outstanding <= 0}>
                                                        <Handshake className="mr-2 h-4 w-4" /> Pay Bill
                                                    </DropdownMenuItem>
                                                </PayBillDialog>
                                            )}
                                            <DropdownMenuItem asChild>
                                                <Link href={`/analysis?accounts=${item.id}`}>
                                                    <BarChartHorizontal className="mr-2 h-4 w-4" /> Analysis
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive">
                                                <XCircle className="mr-2 h-4 w-4" /> Close Account
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {isCreditCard && limit > 0 && (
                                <div className="mt-3 space-y-1.5">
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-[#F2994A] transition-all duration-500 rounded-full"
                                            style={{ width: `${Math.min(100, usagePercent)}%` }}
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
            {creditCards.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-end px-1">
                        <div>
                            <h2 className="text-xl font-bold font-headline">Credit Cards</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-[#F2994A]">
                                {currencySymbol}{formatAmount(creditCards.reduce((sum, c) => sum + Math.max(0, (c.limit || 0) - c.balance), 0))}
                            </p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-widest leading-none mt-1">
                                Available: {currencySymbol}{formatAmount(creditCards.reduce((sum, c) => sum + c.balance, 0))}
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {creditCards.map(renderAccountCard)}
                    </div>
                </div>
            )}

            {otherAccounts.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-xl font-bold font-headline">Savings & Others</h2>
                        <p className="text-xl font-bold text-primary">
                            {currencySymbol}{formatAmount(otherAccounts.reduce((sum, c) => sum + c.balance, 0))}
                        </p>
                    </div>
                    <div className="grid gap-4">
                        {otherAccounts.map(renderAccountCard)}
                    </div>
                </div>
            )}
        </div>
    );
}
