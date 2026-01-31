
'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EnrichedDebt, UserProfile, EnrichedDebtWithBalance } from '@/lib/types';
import { Skeleton } from "@/components/ui/skeleton";
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking, commitBatchNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp, writeBatch, query, collection, where, getDocs } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { cn, formatAmount } from '@/lib/utils';
import { Handshake, Loader2, User, ArrowRight, ArrowLeft, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { AddDebtDialog } from "@/components/debts/AddDebtSheet";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";


interface DebtsListProps {
    debts: EnrichedDebt[];
    isLoading?: boolean;
    selectedPersonNames: string[];
    onSelectionChange: (names: string[]) => void;
    onDeleteSelected: () => void;
    isDeleting: boolean;
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
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <AlertDialogTrigger asChild>
                             <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Handshake className="h-4 w-4" />
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

function DebtGroup({ group, currencySymbol, onSelect, isSelected, selectionMode }: { group: GroupedDebt, currencySymbol: string, onSelect: (name: string) => void, isSelected: boolean, selectionMode: boolean }) {

    const handleIconClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(group.personName);
    };

    return (
         <Collapsible key={group.personName} className="border rounded-lg bg-card overflow-hidden">
            <CollapsibleTrigger asChild>
                <div
                    className={cn("flex items-center justify-between p-4 hover:bg-accent/50", selectionMode && "cursor-pointer")}
                    onClick={() => selectionMode && onSelect(group.personName)}
                >
                     <div className="flex items-center gap-3 flex-grow min-w-0">
                        {selectionMode ? (
                            <Checkbox 
                                checked={isSelected} 
                                onCheckedChange={() => onSelect(group.personName)}
                                onClick={(e) => e.stopPropagation()} 
                                className="flex-shrink-0"
                            />
                        ) : (
                             <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -ml-2" onClick={handleIconClick}>
                                <User className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        )}
                        <div className="flex-grow">
                            <h3 className="font-semibold text-[15px] truncate">{group.personName}</h3>
                            <p className={cn("font-semibold text-sm",
                                group.netAmount > 0 && "text-primary",
                                group.netAmount < 0 && "text-destructive",
                                group.netAmount === 0 && "text-muted-foreground"
                            )}>
                                {group.netAmount > 0 ? `Owes you ${currencySymbol}${formatAmount(group.netAmount)}` : group.netAmount < 0 ? `You owe ${currencySymbol}${formatAmount(Math.abs(group.netAmount))}` : `All Settled`}
                            </p>
                        </div>
                    </div>
                    {!selectionMode && (
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <SettleUpButton group={group} currencySymbol={currencySymbol} />
                            <AddDebtDialog personName={group.personName}>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8"
                                            >
                                                <PlusCircle className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Add transaction for {group.personName}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </AddDebtDialog>
                        </div>
                    )}
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

export function DebtsList({ debts, isLoading, selectedPersonNames, onSelectionChange, onDeleteSelected, isDeleting }: DebtsListProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    const selectionMode = selectedPersonNames.length > 0;

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

    const handleSelectAll = () => {
        if (selectedPersonNames.length === groupedDebts.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(groupedDebts.map(g => g.personName));
        }
    };
    
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
                <p className="text-muted-foreground mt-2">Click "Add Debt" to start tracking.</p>
            </div>
        );
    }

    return (
        <div className="relative">
             {selectionMode && (
                <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-sm p-2 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="select-all-debts"
                            checked={selectedPersonNames.length === groupedDebts.length && groupedDebts.length > 0}
                            onCheckedChange={handleSelectAll}
                        />
                        <Label htmlFor="select-all-debts" className="font-medium text-sm">{selectedPersonNames.length} selected</Label>
                    </div>
                    <div className="flex items-center gap-2">
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={selectedPersonNames.length === 0 || isDeleting}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete all records for {selectedPersonNames.length} person(s).</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={onDeleteSelected} className="bg-destructive hover:bg-destructive/90">
                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Confirm Delete"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="ghost" size="sm" onClick={() => onSelectionChange([])}>Cancel</Button>
                    </div>
                </div>
            )}
            <div className="space-y-3">
                {groupedDebts.map((group) => (
                    <DebtGroup
                        key={group.personName}
                        group={group}
                        currencySymbol={currencySymbol}
                        isSelected={selectedPersonNames.includes(group.personName)}
                        onSelect={(name) => onSelectionChange(
                            selectedPersonNames.includes(name)
                                ? selectedPersonNames.filter(n => n !== name)
                                : [...selectedPersonNames, name]
                        )}
                        selectionMode={selectionMode}
                    />
                ))}
            </div>
        </div>
    );
}
    

    