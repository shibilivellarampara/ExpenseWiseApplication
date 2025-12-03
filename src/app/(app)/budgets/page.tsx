
'use client';

import { PageHeader } from "@/components/PageHeader";
import { AddBudgetSheet } from "@/components/budgets/AddBudgetSheet";
import { BudgetsList } from "@/components/budgets/BudgetsList";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Budget, Category, EnrichedBudget, Expense, UserProfile } from "@/lib/types";
import { collection, query, where, Timestamp } from "firebase/firestore";
import { PlusCircle } from "lucide-react";
import { useMemo } from "react";
import { startOfMonth, endOfMonth, format } from 'date-fns';

export default function BudgetsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const currentMonth = format(new Date(), 'yyyy-MM');

    const budgetsQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/budgets`), where('month', '==', currentMonth)) : null
    , [firestore, user, currentMonth]);
    
    const categoriesQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/categories`) : null, [user, firestore]);

    const expensesQuery = useMemoFirebase(() => {
        if (!user) return null;
        const start = startOfMonth(new Date());
        const end = endOfMonth(new Date());
        return query(
            collection(firestore, `users/${user.uid}/expenses`),
            where('date', '>=', Timestamp.fromDate(start)),
            where('date', '<=', Timestamp.fromDate(end)),
            where('type', '==', 'expense')
        );
    }, [user, firestore]);


    const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);

    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    
    const expensesByCategory = useMemo(() => {
        const map = new Map<string, number>();
        expenses?.forEach(expense => {
            if (expense.categoryId) {
                map.set(expense.categoryId, (map.get(expense.categoryId) || 0) + expense.amount);
            }
        });
        return map;
    }, [expenses]);
    
    const enrichedBudgets = useMemo((): EnrichedBudget[] => {
        if (!budgets) return [];
        return budgets.map(budget => ({
            ...budget,
            category: categoryMap.get(budget.categoryId),
            spentAmount: expensesByCategory.get(budget.categoryId) || 0,
        }));
    }, [budgets, categoryMap, expensesByCategory]);

    const isLoading = budgetsLoading || categoriesLoading || expensesLoading;
    
    return (
        <div className="w-full space-y-8">
            <PageHeader title="Monthly Budgets" description="Manage your spending budgets for the current month.">
                <AddBudgetSheet allCategories={categories || []} existingBudgets={budgets || []}>
                     <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Budget
                    </Button>
                </AddBudgetSheet>
            </PageHeader>
            <BudgetsList budgets={enrichedBudgets} isLoading={isLoading} />
        </div>
    )
}
