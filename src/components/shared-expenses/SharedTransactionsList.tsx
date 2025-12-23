
'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EnrichedSharedTransaction, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { getCurrencySymbol } from "@/lib/currencies";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface SharedTransactionsListProps {
  transactions: EnrichedSharedTransaction[];
  isLoading?: boolean;
}

const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export function SharedTransactionsList({ transactions, isLoading }: SharedTransactionsListProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

  const groupedTransactions = useMemo(() => {
    return transactions.reduce((acc, transaction) => {
        const date = transaction.date.toISOString().split('T')[0];
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(transaction);
        return acc;
    }, {} as { [key: string]: EnrichedSharedTransaction[] });
  }, [transactions]);


  if (isLoading) {
    return (
        <Card>
            <CardContent className="p-4 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-grow space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-6 w-1/4" />
                    </div>
                ))}
            </CardContent>
        </Card>
    )
  }
  
  if (transactions.length === 0) {
    return (
       <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
          <h3 className="text-xl font-semibold">No Transactions Yet</h3>
          <p className="text-muted-foreground mt-2">Add the first transaction to get started.</p>
       </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="space-y-2">
            {Object.entries(groupedTransactions).map(([date, transactionsOnDate]) => (
                <div key={date}>
                    <div className="px-4 py-2 bg-muted/50 sticky top-0 z-10">
                         <h3 className="text-sm font-semibold">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                    </div>
                    {transactionsOnDate.map(item => (
                        <div key={item.id} className="flex items-center gap-4 p-4 border-b">
                            <Avatar>
                                <AvatarImage src={item.member?.photoURL || undefined} alt={item.member?.name || 'User'} />
                                <AvatarFallback>{getInitials(item.member?.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-grow space-y-1">
                                <p className="font-medium">{item.description}</p>
                                <p className="text-xs text-muted-foreground">Added by {item.member?.name}</p>
                            </div>
                            <div className={cn(
                                'font-bold text-lg',
                                item.type === 'income' ? 'text-green-600' : 'text-red-500'
                            )}>
                                {item.type === 'income' ? '+' : '-'}{currencySymbol}{item.amount.toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
