
'use client';

import { PageHeader } from "@/components/PageHeader";
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import { Button } from "@/components/ui/button";
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Expense, EnrichedExpense, Category, Account, Tag, UserProfile } from "@/lib/types";
import { collection, orderBy, query, doc } from "firebase/firestore";
import { Plus, Minus } from "lucide-react";
import { useMemo, useState } from "react";
import { ExpensesFilters, DateRange } from "@/components/expenses/ExpensesFilters";
import { endOfDay, startOfDay } from 'date-fns';
import { ExpensesSummary } from "@/components/expenses/ExpensesSummary";

export default function ExpensesPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const [filters, setFilters] = useState({
        dateRange: { from: undefined, to: undefined } as DateRange,
        type: 'all' as 'all' | 'income' | 'expense',
        categories: [] as string[],
        accounts: [] as string[],
    });

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
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    
    const isLoading = expensesLoading || categoriesLoading || accountsLoading || tagsLoading || profileLoading;

    // Create maps for quick lookups
    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(accounts?.map(p => [p.id, p])), [accounts]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);
    
    // Enrich all expenses first
    const allEnrichedExpenses = useMemo((): EnrichedExpense[] => {
        if (!expenses) return [];
        return expenses.map(expense => ({
            ...expense,
            date: expense.date.toDate(),
            category: categoryMap.get(expense.categoryId),
            account: accountMap.get(expense.accountId),
            tag: expense.tagId ? tagMap.get(expense.tagId) : undefined,
        }));
    }, [expenses, categoryMap, accountMap, tagMap]);

    // Apply filters
    const filteredExpenses = useMemo(() => {
        return allEnrichedExpenses.filter(expense => {
            // Date filter
            const { from, to } = filters.dateRange;
            if (from && expense.date < startOfDay(from)) return false;
            if (to && expense.date > endOfDay(to)) return false;

            // Type filter
            if (filters.type !== 'all' && expense.type !== filters.type) return false;

            // Category filter
            if (filters.categories.length > 0 && !filters.categories.includes(expense.categoryId || '')) return false;

            // Account filter
            if (filters.accounts.length > 0 && !filters.accounts.includes(expense.accountId)) return false;
            
            return true;
        });
    }, [allEnrichedExpenses, filters]);


    // Calculate running balances on the filtered list
    const enrichedAndBalancedExpenses = useMemo((): EnrichedExpense[] => {
        if (!filteredExpenses.length || !accounts || !accountMap.size) return [];
    
        const sortedExpensesChronological = [...filteredExpenses].sort((a, b) => a.date.getTime() - b.date.getTime());
    
        const expensesByAccount = new Map<string, Expense[]>();
        for (const expense of sortedExpensesChronological) {
            if (!expensesByAccount.has(expense.accountId)) {
                expensesByAccount.set(expense.accountId, []);
            }
            expensesByAccount.get(expense.accountId)!.push(expense);
        }
    
        const processedExpenses: EnrichedExpense[] = [];
        const latestTransactionDateByAccount = new Map<string, Date>();

        // Find the latest transaction date for each account within the filtered range
        for (const expense of sortedExpensesChronological) {
            const currentLatest = latestTransactionDateByAccount.get(expense.accountId);
            if (!currentLatest || expense.date > currentLatest) {
                latestTransactionDateByAccount.set(expense.accountId, expense.date);
            }
        }
    
        for (const account of accounts) {
            const accountExpenses = expensesByAccount.get(account.id) || [];
            if (accountExpenses.length === 0) continue;

            const latestDate = latestTransactionDateByAccount.get(account.id);
            if (!latestDate) continue;

            // Find total change of ALL transactions for the account up to the latest date in the filtered range
             const allTransactionsForAccount = allEnrichedExpenses.filter(e => e.accountId === account.id && e.date <= latestDate);
             const totalChange = allTransactionsForAccount.reduce((sum, expense) => {
                 return sum + (expense.type === 'income' ? expense.amount : -expense.amount);
             }, 0);

            // Starting balance is the current balance minus the total change of all transactions up to the latest filtered date
            let runningBalance = account.balance - totalChange;

            for (const expense of accountExpenses) {
                const amountChange = expense.type === 'income' ? expense.amount : -expense.amount;
                runningBalance += amountChange;
    
                processedExpenses.push({
                    ...expense,
                    balanceAfterTransaction: runningBalance,
                });
            }
        }
    
        // Sort the final combined list by date descending for display
        return processedExpenses.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    }, [filteredExpenses, accounts, accountMap, allEnrichedExpenses]);

    return (
        <div className="w-full space-y-4 pb-24"> {/* Add padding-bottom */}
            <PageHeader title="Transactions" description="A detailed list of your recent income and expenses." />

            <ExpensesFilters 
                filters={filters}
                onFiltersChange={setFilters}
                accounts={accounts || []}
                categories={categories || []}
            />

            <ExpensesSummary expenses={filteredExpenses} currency={userProfile?.defaultCurrency} isLoading={isLoading} />

            <ExpensesTable expenses={enrichedAndBalancedExpenses} isLoading={isLoading} />

            <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t p-4 z-40 md:hidden">
                 <div className="container mx-auto flex justify-around gap-2">
                    <AddExpenseDialog initialType="income">
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg text-base font-semibold py-6">
                            <Plus className="mr-2 h-5 w-5" />
                            CASH IN
                        </Button>
                    </AddExpenseDialog>
                    <AddExpenseDialog initialType="expense">
                        <Button className="w-full bg-red-600 hover:bg-red-700 text-white shadow-lg text-base font-semibold py-6">
                            <Minus className="mr-2 h-5 w-5" />
                            CASH OUT
                        </Button>
                    </AddExpenseDialog>
                </div>
            </div>

             <div className="fixed bottom-6 right-6 z-40 hidden md:flex md:flex-col md:gap-3">
                <AddExpenseDialog initialType="income">
                     <Button size="icon" className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg">
                        <Plus className="h-6 w-6" />
                        <span className="sr-only">Add Income</span>
                    </Button>
                </AddExpenseDialog>
                <AddExpenseDialog initialType="expense">
                     <Button size="icon" className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg">
                        <Minus className="h-6 w-6" />
                        <span className="sr-only">Add Expense</span>
                    </Button>
                </AddExpenseDialog>
            </div>
        </div>
    );
}
