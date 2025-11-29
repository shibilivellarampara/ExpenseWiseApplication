
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
import { Check, Loader2, ChevronDown, User, ArrowRight, ArrowLeft, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
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
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Separator } from "../ui/separator";
import { AddDebtSheet } from "./AddDebtSheet";

interface DebtsListProps {
    debts: EnrichedDebt[];
    isLoading?: boolean;
}

interface GroupedDebt {
    personName: string;
    netAmount: number;
    lentTotal: number;
    borrowedTotal: number;
    pendingCount: number;
    records: EnrichedDebt[];
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
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSettling(false);
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={isSettling}>
                    {isSettling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
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

    const groupedDebts = useMemo((): GroupedDebt[] => {
        if (!debts) return [];

        const groups: { [key: string]: GroupedDebt } = {};

        debts.forEach(debt => {
            const personName = debt.personName;
            if (!groups[personName]) {
                groups[personName] = {
                    personName,
                    netAmount: 0,
                    lentTotal: 0,
                    borrowedTotal: 0,
                    pendingCount: 0,
                    records: [],
                };
            }

            const group = groups[personName];
            group.records.push(debt);
            
            if (debt.status === 'pending') {
                if (debt.type === 'lent') {
                    group.netAmount += debt.amount;
                } else {
                    group.netAmount -= debt.amount;
                }
                group.pendingCount++;
            }

            if (debt.type === 'lent') {
                group.lentTotal += debt.amount;
            } else {
                group.borrowedTotal += debt.amount;
            }
        });
        
        return Object.values(groups).sort((a, b) => b.netAmount - a.netAmount);
    }, [debts]);

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
        <div className="space-y-4">
            {groupedDebts.map(group => (
                <Card key={group.personName}>
                    <Collapsible>
                         <div className="flex items-center p-4">
                            <CollapsibleTrigger asChild>
                                 <div className="flex-1 flex items-center gap-4 cursor-pointer hover:bg-muted/50 rounded-md -m-2 p-2">
                                     <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <User className="h-5 w-5" />
                                        {group.personName}
                                    </h3>
                                    <div className="text-sm">
                                        {group.netAmount > 0 ? (
                                            <span className="text-green-600">Owes you {currencySymbol}{group.netAmount.toFixed(2)}</span>
                                        ) : group.netAmount < 0 ? (
                                            <span className="text-red-500">You owe {currencySymbol}{Math.abs(group.netAmount).toFixed(2)}</span>
                                        ) : (
                                            <span className="text-muted-foreground">All settled up</span>
                                        )}
                                    </div>
                                    <ChevronDown className="h-5 w-5 ml-auto transition-transform [&[data-state=open]]:-rotate-180" />
                                </div>
                            </CollapsibleTrigger>
                             <AddDebtSheet personName={group.personName}>
                                <Button variant="ghost" size="icon" className="ml-2 h-8 w-8">
                                    <PlusCircle className="h-5 w-5" />
                                </Button>
                            </AddDebtSheet>
                        </div>
                        <CollapsibleContent>
                            <div className="border-t">
                                {group.records.sort((a,b) => b.date.getTime() - a.date.getTime()).map(record => (
                                    <div key={record.id} className="flex items-center gap-4 px-4 py-3 border-b text-sm">
                                        <div>
                                            {record.type === 'lent' ? 
                                                <ArrowRight className="h-5 w-5 text-green-500" /> : 
                                                <ArrowLeft className="h-5 w-5 text-red-500" />}
                                        </div>
                                        <div className="flex-grow">
                                            <p className="font-medium">{record.description || (record.type === 'lent' ? 'Lent' : 'Borrowed')}</p>
                                            <p className="text-xs text-muted-foreground">{record.date.toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                             <p className={cn("font-semibold", record.type === 'lent' ? 'text-green-600' : 'text-red-500')}>
                                                 {currencySymbol}{record.amount.toFixed(2)}
                                             </p>
                                             <Badge variant={record.status === 'pending' ? 'destructive' : 'secondary'}>{record.status}</Badge>
                                        </div>
                                        <div className="w-8">
                                            {record.status === 'pending' && <SettleDebtButton debt={record} />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>
            ))}
        </div>
    );
}
