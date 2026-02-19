'use client';

import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc, commitBatchNonBlocking } from "@/firebase";
import { Expense, EnrichedExpense, Category, Account, Tag, UserProfile } from "@/lib/types";
import { collection, orderBy, query, doc, where, Timestamp, writeBatch, increment }from "firebase/firestore";
import { Plus, Minus, Trash2, X } from "lucide-react";
import { useMemo, useState, useCallback, useEffect } from "react";
import { ExpensesFilters, Filters } from "@/components/expenses/ExpensesFilters";
import { endOfDay, startOfDay } from 'date-fns';
import { ExpensesSummary } from "@/components/expenses/ExpensesSummary";
import { useDebounce } from "use-debounce";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useToast } from "@/hooks/use-toast";

type ProcessedExpense = Omit<Expense, 'date'> & { date: Date };

export default function ExpensesPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const isMobile = useMediaQuery("(max-width: 768px)");
    const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const searchParams = useSearchParams();

    const [filters, setFilters] = useState<Filters>({
        dateRange: { from: undefined, to: undefined },
        type: 'all',
        categories: [],
        accounts: [],
        tags: [],
        searchQuery: '',
    });
    
    useEffect(() => {
        const accountId = searchParams.get('accounts');
        const type = searchParams.get('type');

        setFilters(prev => ({
            ...prev,
            accounts: accountId ? [accountId] : [],
            type: (type === 'income' || type === 'expense') ? type : 'all',
        }));
    }, [searchParams]);

    
    const [debouncedSearchQuery] = useDebounce(filters.searchQuery, 300);

    const expensesQuery = useMemoFirebase(() => {
        if (!user) return null;

        let q = query(collection(firestore, `users/${user.uid}/expenses`), orderBy('date', 'desc'));
        
        if (filters.dateRange.from) {
            q = query(q, where('date', '>=', Timestamp.fromDate(startOfDay(filters.dateRange.from))));
        }
        if (filters.dateRange.to) {
            q = query(q, where('date', '<=', Timestamp.fromDate(endOfDay(filters.dateRange.to))));
        }
        
        return q;
    }, [user, firestore, filters.dateRange]);
    
    const categoriesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/categories`), orderBy('name', 'asc')) : null, [firestore, user]);
    const accountsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/accounts`), orderBy('name', 'asc')) : null, [firestore, user]);
    const tagsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/tags`), orderBy('name', 'asc')) : null, [firestore, user]);
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);

    const { data: allExpenses, isLoading: expensesLoading, error: expensesError, } = useCollection<Expense>(expensesQuery);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);
    const { data: tags, isLoading: tagsLoading } = useCollection<Tag>(tagsQuery);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const handleDataChange = useCallback(() => {
        setSelectedExpenseIds([]);
    }, []);

    useEffect(() => {
        if(expensesLoading) {
            setSelectedExpenseIds([]);
        }
    }, [expensesLoading])

    const isLoading = expensesLoading || categoriesLoading || accountsLoading || tagsLoading || profileLoading;

    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(accounts?.map(a => [a.id, a])), [accounts]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);
    
    const selectedAccount = useMemo(() => {
        if (filters.accounts.length === 1 && accounts) {
            return accounts.find(acc => acc.id === filters.accounts[0]);
        }
        return undefined;
    }, [filters.accounts, accounts]);

    const filteredAndEnrichedExpenses = useMemo(() => {
        if (!allExpenses || !accounts) return [];

        const getAmountChange = (tx: { type: string; amount: number }) => {
            return tx.type === 'income' ? tx.amount : -tx.amount;
        };
        
        // 1. Group ALL fetched transactions per account to calc balances before filtering
        const transactionsByAccount: Record<string, ProcessedExpense[]> = {};

        allExpenses.forEach(tx => {
            if (tx.accountId) {
                if (!transactionsByAccount[tx.accountId]) {
                    transactionsByAccount[tx.accountId] = [];
                }
                const processed: ProcessedExpense = {
                    ...tx,
                    date: (tx.date as any).toDate()
                };
                transactionsByAccount[tx.accountId].push(processed);
            }
        });

        const allWithBalances: (ProcessedExpense & { runningBalance?: number })[] = [];

        for (const accountId in transactionsByAccount) {
            const accountTransactions = transactionsByAccount[accountId];
            accountTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());
            
            let running = 0;
            accountTransactions.forEach(tx => {
                running += getAmountChange(tx);
                allWithBalances.push({
                    ...tx,
                    runningBalance: running
                });
            });
        }

        // 2. Apply visibility filters
        let finalFiltered = allWithBalances.filter(expense => {
            if (filters.type !== 'all' && expense.type !== filters.type) return false;
            if (filters.accounts.length > 0 && !filters.accounts.includes(expense.accountId || '')) return false;
            if (filters.categories.length > 0 && !filters.categories.includes(expense.categoryId || '')) return false;
            if (filters.tags.length > 0 && !filters.tags.some(tagId => expense.tagIds?.includes(tagId))) return false;
            if (debouncedSearchQuery) {
                const lowerCaseQuery = debouncedSearchQuery.toLowerCase();
                const descriptionMatch = expense.description?.toLowerCase().includes(lowerCaseQuery);
                const amountMatch = String(expense.amount).includes(lowerCaseQuery);
                return descriptionMatch || amountMatch;
            }
            return true;
        });
        
        // 3. Enrich and sort for final display
        let enriched = finalFiltered.map((expense): EnrichedExpense => ({
            ...expense,
            category: expense.categoryId ? categoryMap.get(expense.categoryId) : undefined,
            account: expense.accountId ? accountMap.get(expense.accountId) : undefined,
            tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
        }));

        return enriched.sort((a, b) => b.date.getTime() - a.date.getTime());

    }, [allExpenses, filters, debouncedSearchQuery, categoryMap, accountMap, tagMap, accounts]);
    
    const handleFiltersChange = (newFilters: Filters) => {
        setFilters(newFilters);
    };

    const handleBadgeClick = (type: 'category' | 'tag' | 'account', id: string) => {
        if (type === 'category') {
            setFilters(prev => ({
                ...prev,
                categories: [id],
                tags: [],
                accounts: [],
            }));
        } else if (type === 'tag') {
            setFilters(prev => ({
                ...prev,
                tags: [id],
                categories: [],
                accounts: [],
            }));
        } else { // account
             setFilters(prev => ({
                ...prev,
                accounts: [id],
                categories: [],
                tags: [],
            }));
        }
    };
    
    const handleDeleteSelected = async () => {
        if (!user || !firestore || selectedExpenseIds.length === 0) return;

        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            const accountBalanceUpdates = new Map<string, number>();

            selectedExpenseIds.forEach(id => {
                const expense = filteredAndEnrichedExpenses.find(e => e.id === id);
                if (expense) {
                    const expenseRef = doc(firestore, `users/${user.uid}/expenses`, id);
                    batch.delete(expenseRef);

                    if (expense.account) {
                        const amountChange = expense.type === 'income' ? -expense.amount : expense.amount;
                        accountBalanceUpdates.set(
                            expense.account.id,
                            (accountBalanceUpdates.get(expense.account.id) || 0) + amountChange
                        );
                    }
                }
            });

            accountBalanceUpdates.forEach((amountChange, accountId) => {
                const accountRef = doc(firestore, `users/${user.uid}/accounts`, accountId);
                batch.update(accountRef, { balance: increment(amountChange) });
            });

            await commitBatchNonBlocking(batch, `users/${user.uid}/expenses`);
            toast({
                title: `${selectedExpenseIds.length} Transaction(s) Deleted`,
                description: "The selected transactions have been removed.",
            });
            setSelectedExpenseIds([]);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="w-full space-y-4">
            <ExpensesSummary 
                expenses={filteredAndEnrichedExpenses}
                currency={userProfile?.defaultCurrency} 
                isLoading={isLoading}
                selectedAccount={selectedAccount} 
            />

            <ExpensesFilters 
                filters={filters}
                onFiltersChange={handleFiltersChange}
                accounts={accounts || []}
                categories={categories || []}
                tags={tags || []}
            />
            
            <ExpensesTable 
                expenses={filteredAndEnrichedExpenses} 
                isLoading={isLoading && filteredAndEnrichedExpenses.length === 0} 
                onDataChange={handleDataChange} 
                error={expensesError ? 'Error loading transactions' : null}
                onBadgeClick={handleBadgeClick}
                selectedIds={selectedExpenseIds}
                onSelectionChange={setSelectedExpenseIds}
                isDeleting={isDeleting}
                onDeleteSelected={handleDeleteSelected}
            />

             <div className="fixed bottom-6 right-6 z-10 hidden md:flex md:flex-col md:gap-3">
                <AddExpenseDialog initialType="income" onSaveSuccess={handleDataChange}>
                     <Button size="icon" className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg">
                        <Plus className="h-6 w-6" />
                        <span className="sr-only">Add Income</span>
                    </Button>
                </AddExpenseDialog>
                <AddExpenseDialog initialType="expense" onSaveSuccess={handleDataChange}>
                     <Button size="icon" className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg">
                        <Plus className="h-6 w-6" />
                        <span className="sr-only">Add Expense</span>
                    </Button>
                </AddExpenseDialog>
            </div>
        </div>
    );
}
