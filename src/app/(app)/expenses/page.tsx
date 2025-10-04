'use client';

import { PageHeader } from "@/components/PageHeader";
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Expense, EnrichedExpense, Category, Account, Tag, UserProfile } from "@/lib/types";
import { collection, orderBy, query, doc } from "firebase/firestore";
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

    const accountsQuery = useMemoFirebase(() => 
        user ? collection(firestore, `users/${user.uid}/accounts`) : null
    , [firestore, user]);
    
    const tagsQuery = useMemoFirebase(() => 
        user ? collection(firestore, `users/${user.uid}/tags`) : null
    , [firestore, user]);
    
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);

    // Fetch all data collections
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);
    const { data: tags, isLoading: tagsLoading } = useCollection<Tag>(tagsQuery);
    
    const isLoading = expensesLoading || categoriesLoading || accountsLoading || tagsLoading;

    // Create maps for quick lookups
    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(accounts?.map(p => [p.id, p])), [accounts]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);

    // Enrich expenses with relational data and running balances
    const enrichedExpenses = useMemo((): EnrichedExpense[] => {
        if (!expenses || !accounts) return [];

        // Create a mutable copy of accounts to track running balances
        const currentAccountBalances = new Map(accounts.map(acc => [acc.id, acc.balance]));

        // The `expenses` are already sorted by date descending from the query.
        // We need to process them in chronological order (oldest first) to calculate running balance correctly.
        const sortedExpenses = [...expenses].reverse(); 

        const processedExpenses: EnrichedExpense[] = [];

        sortedExpenses.forEach(expense => {
            const accountBalance = currentAccountBalances.get(expense.accountId);

            if (accountBalance !== undefined) {
                // The balance *after* this transaction is the current running balance.
                const balanceAfter = accountBalance;

                // To get the balance *before* this transaction, we reverse the operation.
                const amountChange = expense.type === 'income' ? -expense.amount : expense.amount;
                const balanceBefore = balanceAfter + amountChange;

                processedExpenses.push({
                    ...expense,
                    date: expense.date.toDate(),
                    category: categoryMap.get(expense.categoryId),
                    account: accountMap.get(expense.accountId),
                    tag: expense.tagId ? tagMap.get(expense.tagId) : undefined,
                    balanceAfterTransaction: balanceAfter,
                });
                
                // Update the running balance for the next (older) transaction.
                currentAccountBalances.set(expense.accountId, balanceBefore);
            }
        });

        // Return the expenses in the original descending order for display
        return processedExpenses.reverse();

    }, [expenses, accounts, categoryMap, accountMap, tagMap]);

    return (
        <div className="space-y-8">
            <PageHeader title="Transactions" description="A detailed list of your recent income and expenses.">
                <AddExpenseDialog>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Transaction
                    </Button>
                </AddExpenseDialog>
            </PageHeader>

            <ExpensesTable expenses={enrichedExpenses} isLoading={isLoading} />
        </div>
    );
}
