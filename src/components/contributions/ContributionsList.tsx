
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EnrichedContribution, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getCurrencySymbol } from "@/lib/currencies";
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';

interface ContributionsListProps {
    contributions: EnrichedContribution[];
    isLoading?: boolean;
}

const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export function ContributionsList({ contributions, isLoading }: ContributionsListProps) {
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
                        <CardContent>
                           <Skeleton className="h-8 w-1/4 mb-2" />
                           <Skeleton className="h-4 w-1/3" />
                        </CardContent>
                        <CardFooter>
                            <Skeleton className="h-10 w-full" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }

    if (contributions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No Shared Expenses Yet</h3>
                <p className="text-muted-foreground mt-2">Click "Add Shared Expense" to get started.</p>
            </div>
        );
    }
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contributions.map(item => (
                <Card key={item.id}>
                    <CardHeader>
                        <CardTitle>{item.description}</CardTitle>
                        <CardDescription>{item.date.toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-3xl font-bold">{currencySymbol}{item.totalAmount.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">Total Amount</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Paid by {item.paidBy?.name || 'Unknown'}</p>
                            <p className="text-sm font-medium mt-2">Contributors:</p>
                            <div className="flex items-center space-x-2 mt-1">
                                {item.contributors?.map(c => (
                                    <div key={c.id} className="flex flex-col items-center">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={c.photoURL || ''} alt={c.name || 'user'}/>
                                            <AvatarFallback>{getInitials(c.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-muted-foreground mt-1">{currencySymbol}{c.share.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" className="w-full">View Details</Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}
