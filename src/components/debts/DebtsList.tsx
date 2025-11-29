
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EnrichedDebt, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { getCurrencySymbol } from "@/lib/currencies";
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { doc, serverTimestamp } from 'firebase/firestore';
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface DebtsListProps {
    debts: EnrichedDebt[];
    isLoading?: boolean;
}

function SettleDebtButton({ debt }: { debt: EnrichedDebt }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isSettling, setIsSettling] = useState(false);
    const { toast } = useToast();

    const handleSettle = async () => {
        if (!user || !firestore) return;
        setIsSettling(true);
        const debtRef = doc(firestore, `users/${user.uid}/debts`, debt.id);
        
        try {
            await setDocumentNonBlocking(debtRef, { status: 'settled', settledAt: serverTimestamp() }, { merge: true });
            toast({ title: 'Debt Settled!', description: `The record with ${debt.personName} has been marked as settled.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSettling(false);
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button size="sm" disabled={isSettling}>
                    {isSettling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Settle Up
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will mark this debt as settled. This action can be undone later.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSettle}>
                         {isSettling ? <Loader2 className="animate-spin" /> : "Yes, settle it"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function DebtsList({ debts, isLoading }: DebtsListProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    const pendingDebts = debts.filter(d => d.status === 'pending');
    const settledDebts = debts.filter(d => d.status === 'settled');

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
                           <Skeleton className="h-4 w-full" />
                        </CardContent>
                        <CardFooter>
                            <Skeleton className="h-10 w-full" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }
    
    if (debts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No Debts or Dues</h3>
                <p className="text-muted-foreground mt-2">Click "Add Debt/Due" to start tracking.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-headline mb-4">Pending</h2>
                 {pendingDebts.length === 0 ? (
                    <p className="text-muted-foreground">No pending debts or dues. All settled up!</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pendingDebts.map(item => (
                             <Card key={item.id} className={cn(
                                item.type === 'lent' ? 'border-green-500/50' : 'border-red-500/50'
                             )}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle>{item.personName}</CardTitle>
                                            <CardDescription>
                                                {item.type === 'lent' ? `Owes you` : `You owe`}
                                            </CardDescription>
                                        </div>
                                         <Badge variant={item.type === 'lent' ? 'default': 'destructive'}>{item.type}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p className={cn("text-3xl font-bold", item.type === 'lent' ? 'text-green-600' : 'text-red-600')}>{currencySymbol}{item.amount.toFixed(2)}</p>
                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                    <p className="text-xs text-muted-foreground">On: {item.date.toLocaleDateString()}</p>
                                </CardContent>
                                <CardFooter>
                                    <SettleDebtButton debt={item} />
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
            <div>
                 <h2 className="text-xl font-headline mb-4">Settled</h2>
                  {settledDebts.length === 0 ? (
                     <p className="text-muted-foreground">No settled records yet.</p>
                 ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {settledDebts.map(item => (
                             <Card key={item.id} className="bg-muted/50">
                                 <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-muted-foreground">{item.personName}</CardTitle>
                                            <CardDescription>
                                                {item.type === 'lent' ? `Owed you` : `You owed`}
                                            </CardDescription>
                                        </div>
                                         <Badge variant="secondary">Settled</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                     <p className="text-3xl font-bold text-muted-foreground line-through">{currencySymbol}{item.amount.toFixed(2)}</p>
                                      <p className="text-sm text-muted-foreground">{item.description}</p>
                                     {item.settledAt && <p className="text-xs text-muted-foreground">Settled on: {item.settledAt.toLocaleDateString()}</p>}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                 )}
            </div>
        </div>
    )
}
