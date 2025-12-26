
'use client';

import { PageHeader } from "@/components/PageHeader";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { SharedLedger, UserProfile } from "@/lib/types";
import { collection, query, where, doc } from "firebase/firestore";
import { useMemo } from "react";
import { AddSharedLedgerSheet } from "@/components/shared-expenses/AddSharedLedgerSheet";
import { SharedExpensesList } from "@/components/shared-expenses/SharedExpensesList";

export default function SharedExpensesPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const ledgersQuery = useMemoFirebase(() => {
        if (!user) return null;
        // Query ledgers where the current user is a member
        return query(collection(firestore, 'shared_ledgers'), where('memberIds', 'array-contains', user.uid));
    }, [user, firestore]);

    const { data: ledgers, isLoading } = useCollection<SharedLedger>(ledgersQuery);

    return (
        <div className="w-full space-y-8">
            <PageHeader
                title="Shared Expenses"
                description="Manage your shared ledgers with friends and family."
            >
                <AddSharedLedgerSheet />
            </PageHeader>
            <SharedExpensesList
                ledgers={ledgers || []}
                isLoading={isLoading}
            />
        </div>
    );
}
