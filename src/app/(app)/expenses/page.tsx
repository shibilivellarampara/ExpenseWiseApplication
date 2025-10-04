'use client';

import { PageHeader } from "@/components/PageHeader";
import { AddExpenseSheet } from "@/components/expenses/AddExpenseSheet";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Expense, EnrichedExpense, Category, PaymentMethod, Tag } from "@/lib/types";
import { collection, orderBy, query } from "firebase/firestore";
import { PlusCircle } from "lucide-react";
import { useMemo } from "react";

export default function ExpensesPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    // Memoized queries for all data collections
    const expensesQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/expenses`), orderBy('date', 'desc')) : null
    , [firestore, user]);

    const categoriesQuery = useMemoFirebase(() => 
        user ? collection(firestore, `users/${user.uid}/categories`) : null
    , [firestore, user]);

    const paymentMethodsQuery = useMemoFirebase(() => 
        user ? collection(firestore, `users/${user.uid}/paymentMethods`) : null
    , [firestore, user]);

    const tagsQuery = useMemoFirebase(() => 
        user ? collection(firestore, `users/${user.uid}/tags`) : null
    , [firestore, user]);

    // Fetch all data collections
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: paymentMethods, isLoading: paymentMethodsLoading } = useCollection<PaymentMethod>(paymentMethodsQuery);
    const { data: tags, isLoading: tagsLoading } = useCollection<Tag>(tagsQuery);
    
    const isLoading = expensesLoading || categoriesLoading || paymentMethodsLoading || tagsLoading;

    // Create maps for quick lookups
    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const paymentMethodMap = useMemo(() => new Map(paymentMethods?.map(p => [p.id, p])), [paymentMethods]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);

    // Enrich expenses with relational data
    const enrichedExpenses = useMemo((): EnrichedExpense[] => {
        if (!expenses) return [];
        return expenses.map(expense => {
            // Ensure date is a JS Date object
            const date = expense.date instanceof Date ? expense.date : expense.date.toDate();
            
            return {
                ...expense,
                date,
                category: categoryMap.get(expense.categoryId),
                paymentMethod: paymentMethodMap.get(expense.paymentMethodId),
                tag: expense.tagId ? tagMap.get(expense.tagId) : undefined,
            };
        });
    }, [expenses, categoryMap, paymentMethodMap, tagMap]);

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

            <ExpensesTable expenses={enrichedExpenses} isLoading={isLoading} />
        </div>
    );
}
