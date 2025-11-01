
'use client';

import { PageHeader } from "@/components/PageHeader";
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc, errorEmitter, FirestorePermissionError } from "@/firebase";
import { Expense, EnrichedExpense, Category, Account, Tag, UserProfile } from "@/lib/types";
import { collection, orderBy, query, doc, onSnapshot }from "firebase/firestore";
import { Plus, Minus } from "lucide-react";
import { useMemo, useState, useCallback, useEffect } from "react";
import { ExpensesFilters, DateRange } from "@/components/expenses/ExpensesFilters";
import { endOfDay, startOfDay } from 'date-fns';
import { ExpensesSummary } from "@/components/expenses/ExpensesSummary";
import { getCache, setCache } from "@/lib/cache";


export default function ExpensesPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const [filters, setFilters] = useState({
        dateRange: { from: undefined, to: undefined } as DateRange,
        type: 'all' as 'all' | 'income' | 'expense',
        categories: [] as string[],
        accounts: [] as string[],
        tags: [] as string[],
    });

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
    
    const expensesBaseQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/expenses`), orderBy('date', 'desc')) : null
    , [firestore, user]);

    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [expensesLoading, setExpensesLoading] = useState(true);
    const [expensesError, setExpensesError] = useState<Error | null>(null);

    useEffect(() => {
        if (!user || !expensesBaseQuery) return;

        const cacheKey = `expenses_${user.uid}`;
        const cachedExpenses = getCache<any[]>(cacheKey);

        if (cachedExpenses) {
            setAllExpenses(cachedExpenses.map(e => ({ ...e, date: new Date(e.date) } as Expense)));
            setExpensesLoading(false);
        } else {
            setExpensesLoading(true);
        }

        const unsubscribe = onSnapshot(expensesBaseQuery, (snapshot) => {
            const fetchedExpenses = snapshot.docs.map(doc => {
                 const data = doc.data() as Expense;
                 const date = data.date && typeof (data.date as any).toDate === 'function' 
                    ? (data.date as any).toDate() 
                    : new Date();
                 return { ...data, id: doc.id, date };
            });
            setAllExpenses(fetchedExpenses);
            setCache(cacheKey, fetchedExpenses.map(e => ({...e, date: e.date.toISOString()})), 60 * 5); // Cache for 5 minutes
            setExpensesLoading(false);
            setExpensesError(null);
        }, (error) => {
            console.error("Error fetching expenses: ", error);
            const contextualError = new FirestorePermissionError({
                path: `users/${user.uid}/expenses`,
                operation: 'list',
            });
            setExpensesError(contextualError);
            errorEmitter.emit('permission-error', contextualError);
            setExpensesLoading(false);
        });

        return () => unsubscribe();

    }, [user, expensesBaseQuery]);


    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);
    const { data: tags, isLoading: tagsLoading } = useCollection<Tag>(tagsQuery);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const isLoading = expensesLoading || categoriesLoading || accountsLoading || tagsLoading || profileLoading;

    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(accounts?.map(a => [a.id, a])), [accounts]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);
    
    const filteredAndEnrichedExpenses = useMemo(() => {
        if (!allExpenses || !categoryMap.size || !accountMap.size) return [];

        let processedExpenses: EnrichedExpense[] = allExpenses.map((expense): EnrichedExpense => ({
            ...expense,
            date: expense.date,
            category: categoryMap.get(expense.categoryId),
            account: accountMap.get(expense.accountId),
            tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
        }));

        if (filters.accounts.length === 1 && accountMap.size > 0) {
            const accountId = filters.accounts[0];
            const account = accountMap.get(accountId);

            if (account) {
                const accountTransactions = allExpenses
                    .filter(tx => tx.accountId === accountId)
                    .sort((a, b) => a.date.getTime() - b.date.getTime());

                let runningBalance = account.balance;
                for (let i = accountTransactions.length - 1; i >= 0; i--) {
                    const tx = accountTransactions[i];
                    const amountChange = tx.account?.type === 'credit_card'
                        ? (tx.type === 'expense' ? tx.amount : -tx.amount)
                        : (tx.type === 'income' ? tx.amount : -tx.amount);
                    
                    const txIndex = processedExpenses.findIndex(p => p.id === tx.id);
                    if (txIndex !== -1) {
                        processedExpenses[txIndex].runningBalance = runningBalance;
                    }
                    runningBalance -= amountChange;
                }
            }
        }
        
        const filteredData = processedExpenses.filter(expense => {
            const { dateRange, type, categories, accounts, tags } = filters;
            if (dateRange.from && expense.date < startOfDay(dateRange.from)) return false;
            if (dateRange.to && expense.date > endOfDay(dateRange.to)) return false;
            if (type !== 'all' && expense.type !== type) return false;
            if (categories.length > 0 && !categories.includes(expense.categoryId || '')) return false;
            if (accounts.length > 0 && !accounts.includes(expense.accountId)) return false;
            if (tags.length > 0 && !expense.tagIds?.some(tagId => tags.includes(tagId))) return false;
            return true;
        });

        return filteredData.sort((a, b) => b.date.getTime() - a.date.getTime());

    }, [allExpenses, categoryMap, accountMap, tagMap, filters]);
    
    const handleFiltersChange = (newFilters: any) => {
        setFilters(newFilters);
    };
    
    const refreshTransactions = () => {
       if (user) {
         setCache(`expenses_${user.uid}`, null, 0); // Invalidate cache
       }
    };

    return (
        <div className="w-full space-y-4 pb-24">
            <PageHeader title="Transactions" description="A detailed list of your recent income and expenses." />

            <ExpensesFilters 
                filters={filters}
                onFiltersChange={handleFiltersChange}
                accounts={accounts || []}
                categories={categories || []}
                tags={tags || []}
            />

            <ExpensesSummary 
                expenses={filteredAndEnrichedExpenses}
                currency={userProfile?.defaultCurrency} 
                isLoading={isLoading} 
            />

            <ExpensesTable 
                expenses={filteredAndEnrichedExpenses} 
                isLoading={isLoading && filteredAndEnrichedExpenses.length === 0} 
                onDataChange={refreshTransactions} 
                error={expensesError ? 'Error loading transactions' : null}
            />

            <div className="fixed bottom-0 left-0 right-0 p-4 z-40 md:hidden">
                 <div className="container mx-auto flex justify-around gap-2">
                    <AddExpenseDialog initialType="income" onSaveSuccess={refreshTransactions}>
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg text-base font-semibold py-6">
                            <Plus className="mr-2 h-5 w-5" />
                            CASH IN
                        </Button>
                    </AddExpenseDialog>
                    <AddExpenseDialog initialType="expense" onSaveSuccess={refreshTransactions}>
                        <Button className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg text-base font-semibold py-6">
                            <Minus className="mr-2 h-5 w-5" />
                            CASH OUT
                        </Button>
                    </AddExpenseDialog>
                </div>
            </div>

             <div className="fixed bottom-6 right-6 z-40 hidden md:flex md:flex-col md:gap-3">
                <AddExpenseDialog initialType="income" onSaveSuccess={refreshTransactions}>
                     <Button size="icon" className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg">
                        <Plus className="h-6 w-6" />
                        <span className="sr-only">Add Income</span>
                    </Button>
                </AddExpenseDialog>
                <AddExpenseDialog initialType="expense" onSaveSuccess={refreshTransactions}>
                     <Button size="icon" className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg">
                        <Minus className="h-6 w-6" />
                        <span className="sr-only">Add Expense</span>
                    </Button>
                </AddExpenseDialog>
            </div>
        </div>
    );
}
