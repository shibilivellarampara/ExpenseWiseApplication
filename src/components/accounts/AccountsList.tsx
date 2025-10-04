'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Account } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import * as LucideIcons from 'lucide-react';
import { getCurrencySymbol } from "@/lib/currencies";
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { Progress } from "../ui/progress";
import { Pilcrow } from "lucide-react";

interface AccountsListProps {
    accounts: Account[];
    isLoading?: boolean;
}

const renderIcon = (iconName: string | undefined) => {
  if (!iconName) return <Pilcrow className="h-6 w-6 text-muted-foreground" />;
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent ? <IconComponent className="h-6 w-6 text-muted-foreground" /> : <Pilcrow className="h-6 w-6 text-muted-foreground" />;
};


export function AccountsList({ accounts, isLoading }: AccountsListProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                     <Card key={i}>
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-1">
                                    <Skeleton className="h-6 w-32" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                           <Skeleton className="h-8 w-1/2 mb-2" />
                           <Skeleton className="h-4 w-full" />
                        </CardContent>
                    </Card>
                ))}
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map(item => {
                const isCreditCard = item.type === 'credit_card';
                const limit = item.limit || 0;
                const balance = item.balance;
                const creditUsedPercentage = isCreditCard && limit > 0 ? (balance / limit) * 100 : 0;
                const availableCredit = isCreditCard ? limit - balance : 0;
                
                return (
                    <Card key={item.id}>
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 flex items-center justify-center bg-muted rounded-full">
                                    {renderIcon(item.icon)}
                                </div>
                                <div>
                                    <CardTitle className="font-headline">{item.name}</CardTitle>
                                    <CardDescription>{item.type.replace('_', ' ')}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <div>
                                <p className="text-sm text-muted-foreground">{isCreditCard ? 'Outstanding' : 'Balance'}</p>
                                <p className="text-2xl font-bold">{currencySymbol}{item.balance.toFixed(2)}</p>
                            </div>
                           {isCreditCard && (
                                <div>
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                        <span>Limit: {currencySymbol}{limit.toFixed(2)}</span>
                                        <span>Available: {currencySymbol}{availableCredit.toFixed(2)}</span>
                                    </div>
                                    <Progress value={creditUsedPercentage} />
                                </div>
                           )}
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
