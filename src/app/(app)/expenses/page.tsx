'use client';

import { PageHeader } from "@/components/PageHeader";
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { Expense, EnrichedExpense, Category, Account, Tag, UserProfile } from "@/lib/types";
import { collection, orderBy, query, doc, where, limit, startAfter, getDocs, Query, DocumentData, Timestamp } from "firebase/firestore";
import { Plus, Minus } from "lucide-react";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { ExpensesFilters, DateRange } from "@/components/expenses/ExpensesFilters";
import { endOfDay, startOfDay } from 'date-fns';
import { ExpensesSummary } from "@/components/expenses/ExpensesSummary";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 50;

export default function ExpensesPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const isMounted = useRef(true);

    const [filters, setFilters] = useState({
        dateRange: { from: undefined, to: undefined } as DateRange,
        type: 'all' as 'all' | 'income' | 'expense',
        categories: [] as string[],
        accounts: [] as string[],
        tags: [] as string[],
    });

    const [allEnrichedExpenses, setAllEnrichedExpenses] = useState<EnrichedExpense[]>([]);
    const [lastVisible, setLastVisible] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const [expensesLoading, setExpensesLoading] = useState(true);
    const [queryError, setQueryError] = useState<string | null>(null);

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

    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);
    const { data: tags, isLoading: tagsLoading } = useCollection<Tag>(tagsQuery);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    
    const isLoading = expensesLoading || categoriesLoading || accountsLoading || tagsLoading || profileLoading;

    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(accounts?.map(p => [p.id, p])), [accounts]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);
    
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const buildQuery = useCallback((startAfterDoc: any = null) => {
        if (!user) return null;

        let q: Query = collection(firestore, `users/${user.uid}/expenses`);
        
        const activeMultiFilterField = filters.categories.length > 0 ? 'categoryId' 
            : filters.accounts.length > 0 ? 'accountId' 
            : filters.tags.length > 0 ? 'tagIds' 
            : null;

        const activeMultiFilterValues = activeMultiFilterField 
            ? filters[activeMultiFilterField === 'tagIds' ? 'tags' : activeMultiFilterField === 'categoryId' ? 'categories' : 'accounts'] 
            : [];
        
        // Apply single-field filters first
        if (filters.dateRange.from) {
            q = query(q, where('date', '>=', Timestamp.fromDate(startOfDay(filters.dateRange.from))));
        }
        if (filters.dateRange.to) {
            q = query(q, where('date', '<=', Timestamp.fromDate(endOfDay(filters.dateRange.to))));
        }
        if (filters.type !== 'all') {
            q = query(q, where('type', '==', filters.type));
        }

        // Apply multi-field filters if any
        if (activeMultiFilterField && activeMultiFilterValues.length > 0) {
            const operator = activeMultiFilterField === 'tagIds' ? 'array-contains-any' : 'in';
            q = query(q, where(activeMultiFilterField, operator, activeMultiFilterValues));
            // Firestore requires the first orderBy to be on the field used in an inequality or array filter.
            q = query(q, orderBy(activeMultiFilterField), orderBy('date', 'desc'));
        } else {
            q = query(q, orderBy('date', 'desc'));
        }
        
        if (startAfterDoc) {
            q = query(q, startAfter(startAfterDoc));
        }
        
        q = query(q, limit(PAGE_SIZE));
        
        return q;
    
    }, [user, firestore, filters]);


    const enrichAndCalculateRunningBalance = useCallback((docs: any[], existingExpenses: EnrichedExpense[]): EnrichedExpense[] => {
        if (!docs.length || !categoryMap.size || !accountMap.size || !accounts) return [];

        const newExpenses: EnrichedExpense[] = docs.map(d => d.data()).map((expense: Expense) => ({
            ...expense,
            date: expense.date.toDate(),
            category: categoryMap.get(expense.categoryId),
            account: accountMap.get(expense.accountId),
            tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
        }));
        
        const allExpensesForCalculation = [...existingExpenses, ...newExpenses].sort((a, b) => a.date.getTime() - b.date.getTime());
        
        const accountBalances = new Map<string, number>();
        accounts.forEach(acc => accountBalances.set(acc.id, acc.balance));

        const processedExpenses = allExpensesForCalculation.reverse().map(expense => {
            const account = expense.account;
            if (account) {
                const currentBalance = accountBalances.get(account.id) ?? 0;
                expense.runningBalance = currentBalance;

                let amountChange = 0;
                if (account.type === 'credit_card') {
                    amountChange = expense.type === 'expense' ? -expense.amount : expense.amount;
                } else {
                    amountChange = expense.type === 'income' ? -expense.amount : expense.amount;
                }
                accountBalances.set(account.id, currentBalance + amountChange);
            }
            return expense;
        });

        return processedExpenses.reverse();

    }, [categoryMap, accountMap, tagMap, accounts]);

    const loadExpenses = useCallback(async (loadMore = false) => {
        setExpensesLoading(true);
        setQueryError(null);
        const q = buildQuery(loadMore ? lastVisible : null);
        if (!q || !accounts) {
            setExpensesLoading(false);
            return;
        }

        try {
            const querySnapshot = await getDocs(q);
            if (!isMounted.current) return;

            const newDocs = querySnapshot.docs;
            const newLastVisible = newDocs.length > 0 ? newDocs[newDocs.length - 1] : null;

            setAllEnrichedExpenses(prevExpenses => {
                const existing = loadMore ? prevExpenses : [];
                const newExpenses = newDocs.map(doc => {
                    const data = doc.data() as Expense;
                    return {
                        ...data,
                        id: doc.id,
                        date: data.date.toDate(),
                        category: categoryMap.get(data.categoryId),
                        account: accountMap.get(data.accountId),
                        tags: data.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
                    };
                });
                return [...existing, ...newExpenses].sort((a,b) => b.date.getTime() - a.date.getTime());
            });

            setLastVisible(newLastVisible);
            setHasMore(newDocs.length === PAGE_SIZE);
        } catch (error: any) {
            console.error("Error fetching expenses:", error);
            setQueryError(error.message || 'An error occurred while fetching data. It might be due to missing database indexes.');
            if (isMounted.current) {
                 setAllEnrichedExpenses([]);
            }
        } finally {
            if (isMounted.current) {
                setExpensesLoading(false);
            }
        }
    }, [buildQuery, accounts, lastVisible, categoryMap, accountMap, tagMap]);
    
    // Initial load and filter change handler
    const handleFiltersChange = (newFilters: any) => {
        setFilters(newFilters);
        setAllEnrichedExpenses([]); // Reset expenses
        setLastVisible(null); // Reset pagination
        setHasMore(true);
        // loadExpenses will be called by useEffect
    };
    
    const refreshTransactions = useCallback(() => {
        setAllEnrichedExpenses([]);
        setLastVisible(null);
        setHasMore(true);
        loadExpenses(false);
    }, [loadExpenses]);

    // Effect for initial load and when filters or accounts change
    useEffect(() => {
        if (accounts) { // Only load expenses once accounts are available
            loadExpenses(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, accounts]);


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

            <ExpensesSummary currency={userProfile?.defaultCurrency} isLoading={isLoading} />

            <ExpensesTable 
                expenses={allEnrichedExpenses} 
                isLoading={expensesLoading && allEnrichedExpenses.length === 0} 
                onDataChange={refreshTransactions} 
                error={queryError}
            />
            
            <Pagination
                onLoadMore={() => loadExpenses(true)}
                isLoading={expensesLoading}
                hasMore={hasMore}
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
