
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EnrichedDebt, UserProfile, EnrichedDebtWithBalance } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { getCurrencySymbol } from "@/lib/currencies";
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking, commitBatchNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { doc, serverTimestamp, writeBatch, query, collection, where, getDocs } from 'firebase/firestore';
import { Badge } from "../ui/badge";
import { cn, formatAmount } from "@/lib/utils";
import { Handshake, Loader2, User, ArrowRight, ArrowLeft, PlusCircle, Trash2, History, MoreVertical } from "lucide-react";
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
import { AddDebtDialog } from "./AddDebtSheet";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';


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
    records: EnrichedDebtWithBalance[];
    lastTransactionDate: Date;
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
            const settlementType = group.netAmount > 0 ? 'income' : 'expense';
            const settlementDescription = group.netAmount > 0 ? `Received from ${group.personName}` : `Paid to ${group.personName}`;

            const debtsCol = collection(firestore, `users/${user.uid}/debts`);
            const newDebtRef = doc(debtsCol);

            batch.set(newDebtRef, {
                id: newDebtRef.id,
                userId: user.uid,
                personName: group.personName,
                amount: settlementAmount,
                type: settlementType === 'income' ? 'borrowed' : 'lent',
                description: settlementDescription,
                date: new Date(),
                status: 'settled',
                settledAt: serverTimestamp(),
                createdAt: serverTimestamp(),
            });

            await commitBatchNonBlocking(batch, `users/${user.uid}/debts`);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Settling Up', description: "Could not settle the balance. Please try again." });
        } finally {
            setIsSettling(false);
        }
    };
    
    if(group.netAmount === 0) return null;

    const settlementActionText = group.netAmount > 0 
        ? `This will create a new settled record of you receiving ${currencySymbol}${formatAmount(group.netAmount)} from ${group.personName} and mark all other pending transactions with them as settled.`
        : `This will create a new settled record of you giving ${currencySymbol}${formatAmount(Math.abs(group.netAmount))} to ${group.personName} and mark all other pending transactions with them as settled.`;

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Handshake className="mr-2 h-4 w-4"/>
                    <span>Settle Balance</span>
                </DropdownMenuItem>
            </AlertDialogTrigger>
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

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
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
            toast({ variant: 'destructive', title: "Error Removing Person", description: "Could not remove person and their records. Please try again." });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4"/>
                    <span>Delete Person &amp; Records</span>
                </DropdownMenuItem>
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

function DeleteTransactionButton({ debt, currencySymbol }: { debt: EnrichedDebt, currencySymbol: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        if (!user || !firestore) return;
        setIsDeleting(true);

        try {
            const debtRef = doc(firestore, `users/${user.uid}/debts`, debt.id);
            await deleteDocumentNonBlocking(debtRef);
            toast({
                title: "Transaction Deleted",
                description: `The record has been removed.`,
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error Deleting Transaction", description: "Could not delete the transaction. Please try again." });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                    </TooltipTrigger>
                     <TooltipContent>
                        <p>Delete this transaction</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
                    <AlertDialogDescription>
                       You are about to permanently delete the transaction: "{debt.description || 'Transaction'}" of {currencySymbol}{formatAmount(debt.amount)}. This cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <Loader2 className="animate-spin" /> : "Yes, delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function DebtGroup({ group, currencySymbol }: { group: GroupedDebt, currencySymbol: string }) {
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
    return (
         <Collapsible key={group.personName} className="border rounded-lg bg-card overflow-hidden">
            <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50">
                    <div className="flex-grow">
                        <h3 className="font-semibold text-[15px]">{group.personName}</h3>
                        <p className={cn("font-semibold text-sm",
                            group.netAmount > 0 && "text-primary",
                            group.netAmount < 0 && "text-destructive",
                            group.netAmount === 0 && "text-muted-foreground"
                        )}>
                            {group.netAmount > 0 ? `Owes you ${currencySymbol}${formatAmount(group.netAmount)}` : group.netAmount < 0 ? `You owe ${currencySymbol}${formatAmount(Math.abs(group.netAmount))}` : `All Settled`}
                        </p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <AddDebtDialog personName={group.personName} open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen} />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsAddSheetOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Transaction
                                </DropdownMenuItem>
                                {group.netAmount !== 0 && <SettleUpButton group={group} currencySymbol={currencySymbol} />}
                                <DropdownMenuSeparator />
                                <DeletePersonButton personName={group.personName} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="px-4 pb-4 pt-2">
                    {group.records.sort((a,b) => b.date.getTime() - a.date.getTime()).map(record => (
                        <div key={record.id} className="flex items-center gap-4 py-3 border-b last:border-b-0 text-sm group">
                            <div>
                                {record.type === 'lent' ? 
                                    <ArrowLeft className="h-5 w-5 text-destructive" /> : 
                                    <ArrowRight className="h-5 w-5 text-primary" />}
                            </div>
                            <div className="flex-grow">
                                <p className="font-medium">
                                    {record.description || (record.type === 'lent' ? 'Given' : 'Received')}
                                </p>
                                <p className="text-xs text-muted-foreground">{record.date.toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                                <p className={cn("font-semibold", record.type === 'lent' ? 'text-destructive' : 'text-primary')}>
                                    {currencySymbol}{formatAmount(record.amount)}
                                </p>
                                {typeof record.runningBalance === 'number' && (
                                    <p className="text-xs text-muted-foreground">Bal: {currencySymbol}{formatAmount(record.runningBalance)}</p>
                                )}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <DeleteTransactionButton debt={record} currencySymbol={currencySymbol} />
                            </div>
                        </div>
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
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

        const groups: { [key: string]: Omit<GroupedDebt, 'records' | 'netAmount'> & { records: EnrichedDebt[], netAmount: number } } = {};

        debts.forEach(debt => {
            const personName = debt.personName;
            if (!groups[personName]) {
                groups[personName] = {
                    personName,
                    lentTotal: 0,
                    borrowedTotal: 0,
                    pendingCount: 0,
                    records: [],
                    lastTransactionDate: new Date(0),
                    netAmount: 0
                };
            }

            const group = groups[personName];
            group.records.push(debt);
        });
        
        // Calculate running balance and other stats for each group
        Object.values(groups).forEach(group => {
            let runningBalance = 0;
            const recordsWithBalance = group.records
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map(record => {
                    const amountChange = record.type === 'lent' ? record.amount : -record.amount;
                    runningBalance += amountChange;
                    return { ...record, runningBalance };
                });

            group.records = recordsWithBalance;
            
            group.records.forEach(debt => {
                 if (debt.date > group.lastTransactionDate) {
                    group.lastTransactionDate = debt.date;
                }
                
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
        });

        // This component no longer sorts, it just groups. Sorting is done on the parent page.
        return Object.values(groups).sort((a, b) => {
            const aIsSettled = a.netAmount === 0;
            const bIsSettled = b.netAmount === 0;

            if (aIsSettled && !bIsSettled) {
                return 1;
            }
            if (!aIsSettled && bIsSettled) {
                return -1;
            }
            return b.lastTransactionDate.getTime() - a.lastTransactionDate.getTime();
        });
    }, [debts]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-1/2 mt-2" />
                    </div>
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
        <div className="space-y-3">
            {groupedDebts.map((group) => (
                <DebtGroup key={group.personName} group={group} currencySymbol={currencySymbol} />
            ))}
        </div>
    );
}
