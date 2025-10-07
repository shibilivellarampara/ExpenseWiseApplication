'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Account, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import * as LucideIcons from 'lucide-react';
import { getCurrencySymbol } from "@/lib/currencies";
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { Progress } from "../ui/progress";
import { Pilcrow, Edit, CreditCard, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface AccountsListProps {
    accounts: Account[];
    isLoading?: boolean;
}

const renderIcon = (iconName: string | undefined, className?: string) => {
  if (!iconName) return <Pilcrow className={cn("h-6 w-6 text-muted-foreground", className)} />;
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent ? <IconComponent className={cn("h-6 w-6 text-muted-foreground", className)} /> : <Pilcrow className={cn("h-6 w-6 text-muted-foreground", className)} />;
};


export function AccountsList({ accounts, isLoading }: AccountsListProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    const creditCards = accounts.filter(acc => acc.type === 'credit_card');
    const otherAccounts = accounts.filter(acc => acc.type !== 'credit_card');

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

    if (accounts.length === 0) {
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
                             const availableCreditPercentage = limit > 0 ? ((limit - balance) / limit) * 100 : 0;
                            
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
                                        <div className="mt-1">
                                            <Progress value={availableCreditPercentage} className="h-2" />
                                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                <span>Limit: {limit.toFixed(2)}</span>
                                                <span>Available: {availableCreditPercentage.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Edit className="h-4 w-4" />
                                    </Button>
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
                        <CardTitle className="font-headline">Other Accounts</CardTitle>
                    </div>
                    <CardDescription>Your bank, wallet, and cash accounts.</CardDescription>
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
                                <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Edit className="h-4 w-4" />
                                </Button>
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
