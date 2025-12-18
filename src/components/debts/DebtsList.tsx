
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EnrichedDebt, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { getCurrencySymbol } from "@/lib/currencies";
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking, commitBatchNonBlocking } from "@/firebase";
import { doc, serverTimestamp, writeBatch, query, collection, where, getDocs, addDoc } from 'firebase/firestore';
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { Handshake, Loader2, ChevronDown, User, ArrowRight, ArrowLeft, PlusCircle, Trash2, History } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

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


function SettleUpButton({ group, currencySymbol }: { group: GroupedDebt, currencySymbol: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isSettling, setIsSettling] = useState(false);
    const { toast } = useToast();

    const handleSettle = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent collapsible from toggling
        if (!user || !firestore || group.netAmount === 0) return;
        setIsSettling(true);

        try {
            const batch = writeBatch(firestore);

            // Mark all pending records for this person as settled
            group.records.forEach(debt => {
                if (debt.status === 'pending') {
                    const debtRef = doc(firestore, `users/${user.uid}/debts`, debt.id);
                    batch.update(debtRef, { status: 'settled', settledAt: serverTimestamp() });
                }
            });

            // Create the balancing transaction
            const settlementAmount = Math.abs(group.netAmount);
            const settlementType = group.netAmount > 0 ? 'borrowed' : 'lent'; // If they owe you, it's like you are "borrowing" the settlement from them.

            const debtsCol = collection(firestore, `users/${user.uid}/debts`);
            const newDebtRef = doc(debtsCol);

            batch.set(newDebtRef, {
                id: newDebtRef.id,
                userId: user.uid,
                personName: group.personName,
                amount: settlementAmount,
                type: settlementType,
                description: 'Settlement',
                date: new Date(),
                status: 'settled',
                settledAt: serverTimestamp(),
                createdAt: serverTimestamp(),
            });

            await commitBatchNonBlocking(batch, `users/${user.uid}/debts`);
            // No toast for success, as per user feedback
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSettling(false);
        }
    };
    
    if(group.netAmount === 0) return null;

    const settlementActionText = group.netAmount > 0 
        ? `This will create a new settled record of you borrowing ${currencySymbol}${group.netAmount.toFixed(2)} from ${group.personName} and mark all other pending transactions with them as settled.`
        : `This will create a new settled record of you lending ${currencySymbol}${Math.abs(group.netAmount).toFixed(2)} to ${group.personName} and mark all other pending transactions with them as settled.`;

    return (
        <AlertDialog>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8">
                                <Handshake className="mr-2 h-4 w-4" />
                                Settle Up
                            </Button>
                        </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Settle outstanding balance</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Settle balance with {group.personName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                       {settlementActionText} This will clear their outstanding balance.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSettle}>
                         {isSettling ? <Loader2 className="animate-spin" /> : "Yes, Settle Up"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function DeletePersonButton({ personName }: { personName: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        if (!user || !firestore) return;
        setIsDeleting(true);

        try {
            const batch = writeBatch(firestore);
            const debtsQuery = query(collection(firestore, `users/${user.uid}/debts`), where('personName', '==', personName));
            const snapshot = await getDocs(debtsQuery);
            
            if (snapshot.empty) {
                toast({ variant: "destructive", title: "No records found for this person." });
                setIsDeleting(false);
                return;
            }

            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            await commitBatchNonBlocking(batch, `users/${user.uid}/debts`);
            
            toast({
                title: "Person Removed",
                description: `All debt records for "${personName}" have been deleted.`,
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete "{personName}" and all associated debt records. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <Loader2 className="animate-spin" /> : `Yes, delete ${personName}`}
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
        
        return Object.values(groups).sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount));
    }, [debts]);

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                     <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                        </CardHeader>
                        <CardContent>
                           <Skeleton className="h-10 w-1/2 mb-2" />
                           <Skeleton className="h-4 w-full" />
                        </CardContent>
                         <CardFooter>
                           <Skeleton className="h-9 w-full" />
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groupedDebts.map(group => (
                <Card key={group.personName}>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                             <User className="h-5 w-5" />
                            {group.personName}
                        </CardTitle>
                        <div className="flex items-center gap-1">
                            <AddDebtSheet personName={group.personName}>
                                <Button size="icon" variant="ghost" className="h-8 w-8">
                                    <PlusCircle className="h-4 w-4" />
                                </Button>
                            </AddDebtSheet>
                            <DeletePersonButton personName={group.personName} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center space-y-1">
                            <p className="text-sm text-muted-foreground">
                                {group.netAmount > 0 ? `Owes you` : group.netAmount < 0 ? `You owe` : `All Settled`}
                            </p>
                            <p className={cn("text-3xl font-bold tracking-tight",
                                group.netAmount > 0 && "text-green-600",
                                group.netAmount < 0 && "text-red-500"
                            )}>
                                {currencySymbol}{Math.abs(group.netAmount).toFixed(2)}
                            </p>
                             <div className="pt-2">
                                <SettleUpButton group={group} currencySymbol={currencySymbol} />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="p-0">
                         <Collapsible className="w-full">
                             <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-center p-4 border-t cursor-pointer hover:bg-muted/50 rounded-b-lg">
                                    <History className="h-4 w-4 mr-2" />
                                    <span className="text-sm font-medium">View History</span>
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="bg-muted/50">
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
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}

