
'use client';

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AddSharedExpenseSheet } from "@/components/shared-expenses/AddSharedExpenseSheet";
import { SharedExpensesList } from "@/components/shared-expenses/SharedExpensesList";
import { useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, where, query } from "firebase/firestore";
import { useCollection } from "@/firebase/firestore/use-collection";
import { SharedExpense } from "@/lib/types";

export default function SharedExpensesPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const sharedExpensesQuery = useMemoFirebase(() =>
        user ? query(collection(firestore, 'shared_expenses'), where('memberIds', 'array-contains', user.uid)) : null
    , [user, firestore]);

    const { data: sharedExpenses, isLoading } = useCollection<SharedExpense>(sharedExpensesQuery);

    return (
        <div className="w-full space-y-8">
            <PageHeader title="Shared Expenses" description="Create and manage shared expense ledgers with others.">
                <AddSharedExpenseSheet>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Shared Space
                    </Button>
                </AddSharedExpenseSheet>
            </PageHeader>
            
            <SharedExpensesList sharedExpenses={sharedExpenses || []} isLoading={isLoading} />
        </div>
    );
}
