'use client';

import { PageHeader } from "@/components/PageHeader";
import { AddDebtDialog } from "@/components/debts/AddDebtSheet";
import { DebtsList } from "@/components/debts/DebtsList";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase, commitBatchNonBlocking } from "@/firebase";
import { Debt, EnrichedDebt } from "@/lib/types";
import { collection, orderBy, query, where, getDocs, writeBatch } from "firebase/firestore";
import { PlusCircle, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { DebtsSummary } from "@/components/debts/DebtsSummary";
import { useDebounce } from "use-debounce";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function DebtsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [typeFilter, setTypeFilter] = useState<'all' | 'lent' | 'borrowed'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

    const [selectedPersonNames, setSelectedPersonNames] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const debtsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/debts`), orderBy('date', 'desc'))
    }, [firestore, user]);

    const { data: debts, isLoading } = useCollection<Debt>(debtsQuery);
    
    const enrichedDebts = useMemo((): EnrichedDebt[] => {
        if (!debts) return [];
        return debts.map(d => ({ ...d, date: d.date.toDate(), settledAt: d.settledAt?.toDate() })) || [];
    }, [debts]);

    const handleFilterChange = (type: 'lent' | 'borrowed') => {
        setTypeFilter(current => current === type ? 'all' : type);
    };
    
    const handleDeleteSelected = async () => {
        if (!user || !firestore || selectedPersonNames.length === 0) return;

        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            
            const debtsRef = collection(firestore, `users/${user.uid}/debts`);
            const q = query(debtsRef, where('personName', 'in', selectedPersonNames));
            
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                toast({ variant: "destructive", title: "No records found for the selected person(s)." });
            } else {
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await commitBatchNonBlocking(batch, `users/${user.uid}/debts`);
                toast({
                    title: `${selectedPersonNames.length} Person(s) Removed`,
                    description: `All debt records for the selected people have been deleted.`,
                });
            }
            setSelectedPersonNames([]);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error Removing Records", description: "Could not remove records. Please try again." });
        } finally {
            setIsDeleting(false);
        }
    };


    const filteredDebts = useMemo(() => {
        let filtered = enrichedDebts;

        if (typeFilter !== 'all') {
             const groups = enrichedDebts.reduce((acc, debt) => {
                if (!acc[debt.personName]) {
                    acc[debt.personName] = { netAmount: 0, records: [] };
                }
                if (debt.status === 'pending') {
                     acc[debt.personName].netAmount += (debt.type === 'lent' ? debt.amount : -debt.amount);
                }
                acc[debt.personName].records.push(debt);
                return acc;
            }, {} as { [key: string]: { netAmount: number; records: EnrichedDebt[] } });

            const filteredPersonNames = Object.keys(groups).filter(personName => {
                const group = groups[personName];
                if (typeFilter === 'lent') {
                    return group.netAmount > 0;
                }
                if (typeFilter === 'borrowed') {
                    return group.netAmount < 0;
                }
                return false;
            });
            filtered = enrichedDebts.filter(debt => filteredPersonNames.includes(debt.personName));
        }
        
        if (debouncedSearchQuery) {
            const lowercasedQuery = debouncedSearchQuery.toLowerCase();
            const personNames = new Set(
                enrichedDebts
                    .filter(debt => debt.personName.toLowerCase().includes(lowercasedQuery))
                    .map(debt => debt.personName)
            );
            filtered = filtered.filter(debt => personNames.has(debt.personName));
        }


        return filtered;
    }, [enrichedDebts, typeFilter, debouncedSearchQuery]);


    return (
        <div className="w-full space-y-6 pb-32">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold font-headline text-foreground">Debts & Dues</h1>
            </div>
            
            <DebtsSummary 
                debts={enrichedDebts} 
                isLoading={isLoading}
                onFilterChange={handleFilterChange}
                activeFilter={typeFilter}
            />
            
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-12 bg-card border-none shadow-sm rounded-2xl"
                    />
                    {searchQuery && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                            onClick={() => setSearchQuery('')}
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    )}
                </div>
                <AddDebtDialog>
                     <Button className="h-12 px-6 bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-md gap-2 shrink-0">
                        <PlusCircle className="h-5 w-5" />
                        <span className="hidden sm:inline">Add Debt</span>
                        <span className="sm:hidden">Add</span>
                    </Button>
                </AddDebtDialog>
            </div>

            <DebtsList 
                debts={filteredDebts} 
                isLoading={isLoading}
                selectedPersonNames={selectedPersonNames}
                onSelectionChange={setSelectedPersonNames}
                onDeleteSelected={handleDeleteSelected}
                isDeleting={isDeleting}
             />
        </div>
    )
}