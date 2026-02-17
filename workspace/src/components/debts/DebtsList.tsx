'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { EnrichedDebt, UserProfile, EnrichedDebtWithBalance } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc, useFirestore, useUser, useMemoFirebase, deleteDocumentNonBlocking, commitBatchNonBlocking } from '@/firebase';
import { doc, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { cn, formatAmount } from '@/lib/utils';
import { Handshake, Loader2, User, ArrowRight, ArrowLeft, PlusCircle, Trash2, ChevronDown, MoreVertical } from 'lucide-react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AddDebtDialog } from '@/components/debts/AddDebtSheet';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { getCurrencySymbol } from '@/lib/currencies';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


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
        e.stopPropagation(); // Prevent dropdown from toggling
        if (!user || !firestore || group.netAmount === 0) return;
        setIsSettling(true);

        try {
            const batch = writeBatch(firestore);

            group.records.forEach(debt => {
                if (debt.status === 'pending') {
                    const debtRef = doc(firestore, `users/${user.uid}/debts`, debt.id);
                    batch.update(debtRef, { status: 'settled', settledAt: serverTimestamp() });
                }
            });

            const settlementAmount = Math.abs(group.netAmount);
            const settlementType = group.netAmount > 0 ? 'borrowed' : 'lent';
            const settlementDescription = group.netAmount > 0 ? `Settlement: Received from ${group.personName}` : `Settlement: Paid to ${group.personName}`;

            const debtsCol = collection(firestore, `users/${user.uid}/debts`);
            const newDebtRef = doc(debtsCol);

            batch.set(newDebtRef, {
                id: newDebtRef.id,
                userId: user.uid,
                personName: group.personName,
                amount: settlementAmount,
                type: settlementType,
                description: settlementDescription,
                date: new Date(),
                status: 'settled',
                settledAt: serverTimestamp(),
                createdAt: serverTimestamp(),
            });

            await commitBatchNonBlocking(batch, `users/${user.uid}/debts`);
            toast({ title: "Balance Settled" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Settling Up', description: "Could not settle the balance. Please try again." });
        } finally {
            setIsSettling(false);
        }
    };
    
    if(group.netAmount === 0) return null;

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-primary">
                    <Handshake className="mr-2 h-4 w-4" />
                    Settle Up
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[24px]">
                <AlertDialogHeader>
                    <AlertDialogTitle>Settle balance with {group.personName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                       This will mark all pending transactions with {group.personName} as settled and create a balancing record.
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
            toast({ title: "Transaction Deleted" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error Deleting Transaction" });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[24px]">
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
                    <AlertDialogDescription>
                       This will permanently delete the transaction: "{debt.description || 'Transaction'}" of {currencySymbol}{formatAmount(debt.amount)}.
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
    const [isExpanded, setIsExpanded] = useState(false);

    return (
         <Card className="rounded-[20px] border-none shadow-sm hover:shadow-md transition-all duration-300 bg-card overflow-hidden">
            <CardContent className="p-4">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        <button
                            onClick={(e) => { e.stopPropagation(); onSelect(group.personName); }}
                            className={cn(
                                "h-12 w-12 rounded-full bg-muted flex items-center justify-center transition-colors",
                                isSelected ? "bg-primary text-white" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                            )}
                        >
                            {selectionMode ? (
                                <Checkbox 
                                    checked={isSelected} 
                                    onCheckedChange={() => onSelect(group.personName)}
                                    className="border-none bg-transparent"
                                />
                            ) : (
                                <User className="h-6 w-6" />
                            )}
                        </button>
                    </div>

                    <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <div className="min-w-0">
                                <h3 className="font-bold text-base truncate">{group.personName}</h3>
                                <p className="text-xs text-muted-foreground font-medium">
                                    {group.pendingCount} pending transactions
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-right">
                                    {group.netAmount === 0 ? (
                                        <Badge className="bg-primary/10 text-primary border-none font-bold uppercase text-[10px]">Settled</Badge>
                                    ) : (
                                        <p className={cn(
                                            "font-bold text-lg leading-none",
                                            group.netAmount > 0 ? "text-primary" : "text-destructive"
                                        )}>
                                            {currencySymbol}{formatAmount(Math.abs(group.netAmount))}
                                        </p>
                                    )}
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground focus-visible:ring-0">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl">
                                        <AddDebtDialog personName={group.personName}>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add Record
                                            </DropdownMenuItem>
                                        </AddDebtDialog>
                                        {group.netAmount !== 0 && <SettleUpButton group={group} currencySymbol={currencySymbol} />}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                            onSelect={(e) => { e.preventDefault(); onSelect(group.personName); }}
                                            className={isSelected ? "bg-muted" : ""}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" /> {selectionMode ? 'Unselect' : 'Delete records'}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 p-0 text-[10px] uppercase font-bold text-muted-foreground/70 tracking-widest hover:bg-transparent">
                                    {isExpanded ? 'Hide history' : 'View history'}
                                    <ChevronDown className={cn("ml-1 h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-3 space-y-3">
                                {group.records.sort((a,b) => b.date.getTime() - a.date.getTime()).map(record => (
                                    <div key={record.id} className="flex items-center gap-3 py-2 border-t border-muted/50 text-sm group/item">
                                        <div className={cn(
                                            "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                                            record.type === 'lent' ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                                        )}>
                                            {record.type === 'lent' ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="font-medium truncate">{record.description || (record.type === 'lent' ? 'Money Given' : 'Money Received')}</p>
                                            <p className="text-[10px] text-muted-foreground">{record.date.toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={cn("font-bold", record.type === 'lent' ? 'text-destructive' : 'text-primary')}>
                                                {currencySymbol}{formatAmount(record.amount)}
                                            </p>
                                            {record.status === 'settled' && <Badge className="h-3 text-[8px] bg-muted text-muted-foreground uppercase py-0 px-1 border-none">Settled</Badge>}
                                        </div>
                                        <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                                            <DeleteTransactionButton debt={record} currencySymbol={currencySymbol} />
                                        </div>
                                    </div>
                                ))}
                            </CollapsibleContent>
                        </Collapsible>
                    </div>
                </div>
            </CardContent>
        </Card>
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
                    <Skeleton key={i} className="h-32 w-full rounded-[20px]" />
                ))}
            </div>
        )
    }
    
    if (debts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-[20px] bg-card/50">
                <h3 className="text-xl font-semibold">No Debts Found</h3>
                <p className="text-muted-foreground mt-2">Click "Add Debt" to start tracking your dues.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
             {selectionMode && (
                <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-sm p-3 rounded-2xl border shadow-sm flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 pl-1">
                        <Checkbox
                            id="select-all-debts"
                            checked={selectedPersonNames.length === groupedDebts.length && groupedDebts.length > 0}
                            onCheckedChange={handleSelectAll}
                        />
                        <Label htmlFor="select-all-debts" className="font-bold text-sm">{selectedPersonNames.length} selected</Label>
                    </div>
                    <div className="flex items-center gap-2">
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="h-9 px-4 rounded-xl" disabled={selectedPersonNames.length === 0 || isDeleting}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[24px]">
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
                        <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl" onClick={() => onSelectionChange([])}>Cancel</Button>
                    </div>
                </div>
            )}
            <div className="grid gap-4">
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