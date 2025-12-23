
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SharedExpense } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { getCurrencySymbol } from "@/lib/currencies";
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { UserProfile } from "@/lib/types";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SharedExpensesListProps {
    sharedExpenses: SharedExpense[];
    isLoading?: boolean;
}

export function SharedExpensesList({ sharedExpenses, isLoading }: SharedExpensesListProps) {
    const { user } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                     <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                         <CardFooter>
                            <Skeleton className="h-4 w-1/4" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }

    if (sharedExpenses.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No Shared Ledgers Found</h3>
                <p className="text-muted-foreground mt-2">Create a new ledger or join one using an invite code.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sharedExpenses.map(item => (
                <Link key={item.id} href={`/shared-expenses/${item.id}`} passHref>
                    <Card className="hover:bg-accent transition-colors cursor-pointer h-full flex flex-col">
                        <CardHeader className="flex-grow">
                            <CardTitle>{item.name}</CardTitle>
                            <CardDescription>{item.memberIds.length} members</CardDescription>
                        </CardHeader>
                        <CardFooter className="flex justify-between items-center">
                            <div className="font-semibold text-lg">
                                {currencySymbol}{item.balance.toFixed(2)}
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </CardFooter>
                    </Card>
                </Link>
            ))}
        </div>
    )
}
