
'use client';

import { PageHeader } from "@/components/PageHeader";
import { AddDebtSheet } from "@/components/debts/AddDebtSheet";
import { DebtsList } from "@/components/debts/DebtsList";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Debt } from "@/lib/types";
import { collection, orderBy, query } from "firebase/firestore";
import { PlusCircle } from "lucide-react";
import { useMemo } from "react";

export default function DebtsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const debtsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/debts`), orderBy('date', 'desc'))
    }, [firestore, user]);

    const { data: debts, isLoading } = useCollection<Debt>(debtsQuery);
    
    const enrichedDebts = useMemo(() => {
        return debts?.map(d => ({ ...d, date: d.date.toDate(), settledAt: d.settledAt?.toDate() })) || [];
    }, [debts]);

    return (
        <div className="w-full space-y-8">
            <PageHeader title="Debts & Dues" description="Track money you've borrowed or lent to others.">
                <AddDebtSheet>
                     <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Debt/Due
                    </Button>
                </AddDebtSheet>
            </PageHeader>
            
            <DebtsList debts={enrichedDebts} isLoading={isLoading} />
        </div>
    )
}
