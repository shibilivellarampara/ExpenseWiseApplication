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
import { DebtsSummary } from "@/components/debts/DebtsSummary";

export default function DebtsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [typeFilter, setTypeFilter] = useState<'all' | 'lent' | 'borrowed'>('all');

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

    const filteredDebts = useMemo(() => {
        if (typeFilter === 'all') {
            return enrichedDebts;
        }

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
                return group.netAmount < 0;
            }
            if (typeFilter === 'borrowed') {
                return group.netAmount > 0;
            }
            return false;
        });

        return enrichedDebts.filter(debt => filteredPersonNames.includes(debt.personName));
    }, [enrichedDebts, typeFilter]);


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
            
            <DebtsSummary 
                debts={enrichedDebts} 
                isLoading={isLoading}
                onFilterChange={handleFilterChange}
                activeFilter={typeFilter}
            />

            <DebtsList debts={filteredDebts} isLoading={isLoading} />
        </div>
    )
}
