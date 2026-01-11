'use client';

import { PageHeader } from "@/components/PageHeader";
import { AddDebtDialog } from "@/components/debts/AddDebtSheet";
import { DebtsList } from "@/components/debts/DebtsList";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Debt, EnrichedDebt } from "@/lib/types";
import { collection, orderBy, query } from "firebase/firestore";
import { PlusCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { DebtsFilters, type DebtFilterState, type DebtSortState } from "@/components/debts/DebtsFilters";

export default function DebtsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [filters, setFilters] = useState<DebtFilterState>({ status: 'all', type: 'all' });
    const [sortBy, setSortBy] = useState<DebtSortState>('recent');

    const debtsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/debts`), orderBy('date', 'desc'))
    }, [firestore, user]);

    const { data: debts, isLoading } = useCollection<Debt>(debtsQuery);
    
    const enrichedAndSortedDebts = useMemo(() => {
        if (!debts) return [];

        const enriched = debts.map(d => ({ ...d, date: d.date.toDate(), settledAt: d.settledAt?.toDate() })) || [];

        const filtered = enriched.filter(debt => {
            const statusMatch = filters.status === 'all' || debt.status === filters.status;
            const typeMatch = filters.type === 'all' || debt.type === filters.type;
            return statusMatch && typeMatch;
        });

        // The sorting logic from DebtsList is now here to sort the main data array
        const grouped = filtered.reduce((acc, debt) => {
            if (!acc[debt.personName]) {
                acc[debt.personName] = {
                    personName: debt.personName,
                    netAmount: 0,
                    lentTotal: 0,
                    borrowedTotal: 0,
                    pendingCount: 0,
                    records: [],
                    lastTransactionDate: new Date(0),
                };
            }
            const group = acc[debt.personName];
            group.records.push(debt);
            if (debt.date > group.lastTransactionDate) {
                group.lastTransactionDate = debt.date;
            }
            if (debt.status === 'pending') {
                group.netAmount += (debt.type === 'lent' ? debt.amount : -debt.amount);
                group.pendingCount++;
            }
            if (debt.type === 'lent') group.lentTotal += debt.amount;
            if (debt.type === 'borrowed') group.borrowedTotal += debt.amount;
            return acc;
        }, {} as Record<string, any>);
        
        let sortedGroupKeys = Object.keys(grouped);

        switch (sortBy) {
            case 'name':
                sortedGroupKeys.sort((a, b) => a.localeCompare(b));
                break;
            case 'owedToYou':
                sortedGroupKeys.sort((a, b) => grouped[b].netAmount - grouped[a].netAmount);
                break;
            case 'youOwe':
                sortedGroupKeys.sort((a, b) => grouped[a].netAmount - grouped[b].netAmount);
                break;
            case 'recent':
            default:
                 sortedGroupKeys.sort((a, b) => grouped[b].lastTransactionDate.getTime() - grouped[a].lastTransactionDate.getTime());
                break;
        }

        return sortedGroupKeys.flatMap(key => grouped[key].records);

    }, [debts, filters, sortBy]);

    return (
        <div className="w-full space-y-8">
            <PageHeader title="Debts & Dues" description="Track money you've borrowed or lent to others.">
                <AddDebtDialog>
                     <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Debt/Due
                    </Button>
                </AddDebtDialog>
            </PageHeader>
            
            <DebtsFilters 
                filters={filters} 
                onFilterChange={setFilters}
                sortBy={sortBy}
                onSortChange={setSortBy}
            />

            <DebtsList debts={enrichedAndSortedDebts} isLoading={isLoading} />
        </div>
    )
}
