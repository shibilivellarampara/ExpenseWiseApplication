'use client';

import { PageHeader } from "@/components/PageHeader";
import { AddExpenseSheet } from "@/components/expenses/AddExpenseSheet";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Expense } from "@/lib/types";
import { collection, orderBy, query } from "firebase/firestore";
import { PlusCircle } from "lucide-react";
import { useMemo } from "react";

export default function ExpensesPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const expensesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, `users/${user.uid}/expenses`),
            orderBy('date', 'desc')
        );
    }, [firestore, user]);

    const { data: expenses, isLoading } = useCollection<Expense>(expensesQuery);

    const formattedExpenses = useMemo(() => {
        return expenses?.map(exp => ({
            ...exp,
            // Convert Firestore Timestamp to JS Date object
            date: exp.date.toDate(),
        })) || [];
    }, [expenses]);

    return (
        <div className="space-y-8">
            <PageHeader title="Your Expenses" description="A detailed list of your recent expenses.">
                <AddExpenseSheet>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Expense
                    </Button>
                </AddExpenseSheet>
            </PageHeader>

            <ExpensesTable expenses={formattedExpenses} isLoading={isLoading} />
        </div>
    );
}
