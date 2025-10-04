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
        if (!expenses || !accounts || !accountMap.size) return [];
    
        // The `expenses` are sorted by date descending from the query. For our calculation, we need them ascending.
        const sortedExpensesChronological = [...expenses].reverse();
    
        // Group expenses by account
        const expensesByAccount = new Map<string, Expense[]>();
        for (const expense of sortedExpensesChronological) {
            if (!expensesByAccount.has(expense.accountId)) {
                expensesByAccount.set(expense.accountId, []);
            }
            expensesByAccount.get(expense.accountId)!.push(expense);
        }
    
        const processedExpenses: EnrichedExpense[] = [];
    
        // For each account, calculate the running balance
        for (const account of accounts) {
            const accountExpenses = expensesByAccount.get(account.id) || [];
            if (accountExpenses.length === 0) continue;
    
            // Calculate the total change from all transactions for this account
            const totalChange = accountExpenses.reduce((sum, expense) => {
                const amount = expense.type === 'income' ? expense.amount : -expense.amount;
                return sum + amount;
            }, 0);
    
            // Determine the starting balance (balance before the first transaction)
            let runningBalance = account.balance - totalChange;
    
            for (const expense of accountExpenses) {
                // Apply the transaction to the running balance
                const amountChange = expense.type === 'income' ? expense.amount : -expense.amount;
                runningBalance += amountChange;
    
                processedExpenses.push({
                    ...expense,
                    date: expense.date.toDate(),
                    category: categoryMap.get(expense.categoryId),
                    account: accountMap.get(expense.accountId),
                    tag: expense.tagId ? tagMap.get(expense.tagId) : undefined,
                    balanceAfterTransaction: runningBalance,
                });
            }
        }
    
        // Sort the final combined list by date descending for display
        return processedExpenses.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    }, [expenses, accounts, categoryMap, accountMap, tagMap]);

    return (
        <div className="space-y-8 w-full">
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
