'use client';

import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc, commitBatchNonBlocking } from "@/firebase";
import { Expense, EnrichedExpense, Category, Account, Tag, UserProfile } from "@/lib/types";
import { collection, orderBy, query, doc, where, Timestamp, writeBatch, increment, limit } from "firebase/firestore";
import { Plus, Minus, Trash2 } from "lucide-react";
import { useMemo, useState, useCallback, useEffect, Suspense } from "react";
import { ExpensesFilters, Filters } from "@/components/expenses/ExpensesFilters";
import { endOfDay, startOfDay } from 'date-fns';
import { ExpensesSummary } from "@/components/expenses/ExpensesSummary";
import { useDebounce } from "use-debounce";
import { useSearchParams } from "next/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useToast } from "@/hooks/use-toast";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 50;

function ExpensesPageContent() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const isMobile = useMediaQuery("(max-width: 768px)");
    const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

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

    const dateFrom = filters.dateRange.from?.getTime();
    const dateTo = filters.dateRange.to?.getTime();

    const listQuery = useMemoFirebase(() => {
        if (!user) return null;

        let q = query(
            collection(firestore, `users/${user.uid}/expenses`), 
            orderBy('date', 'desc'),
            limit(displayLimit)
        );
        
        if (dateFrom) {
            q = query(q, where('date', '>=', Timestamp.fromDate(startOfDay(new Date(dateFrom)))));
        }
        if (dateTo) {
            q = query(q, where('date', '<=', Timestamp.fromDate(endOfDay(new Date(dateTo)))));
        }
        
        return q;
    }, [user, firestore, dateFrom, dateTo, displayLimit]);

    const summaryQuery = useMemoFirebase(() => {
        if (!user) return null;

        let q = query(collection(firestore, `users/${user.uid}/expenses`));
        
        if (dateFrom) {
            q = query(q, where('date', '>=', Timestamp.fromDate(startOfDay(new Date(dateFrom)))));
        }
        if (dateTo) {
            q = query(q, where('date', '<=', Timestamp.fromDate(endOfDay(new Date(dateTo)))));
        }
        
        return q;
    }, [user, firestore, dateFrom, dateTo]);
    
    const categoriesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/categories`), orderBy('name', 'asc')) : null, [firestore, user]);
    const accountsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/accounts`), orderBy('name', 'asc')) : null, [firestore, user]);
    const tagsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/tags`), orderBy('name', 'asc')) : null, [firestore, user]);
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);

    const { data: listExpenses, isLoading: listLoading, error: listError } = useCollection<Expense>(listQuery);
    const { data: summaryExpenses, isLoading: summaryLoading } = useCollection<Expense>(summaryQuery);
    const { data: categories } = useCollection<Category>(categoriesQuery);
    const { data: accounts } = useCollection<Account>(accountsQuery);
    const { data: tags } = useCollection<Tag>(tagsQuery);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const isLoading = listLoading || profileLoading;

    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(accounts?.map(a => [a.id, a])), [accounts]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);
    
    const selectedAccount = useMemo(() => {
        if (filters.accounts.length === 1 && accounts) {
            return accounts.find(acc => acc.id === filters.accounts[0]);
        }
        return undefined;
    }, [filters.accounts, accounts]);

    const enrichAndFilter = useCallback((data: Expense[] | null) => {
        if (!data || !accounts) return [];

        return data
            .map(expense => ({
                ...expense,
                date: (expense.date as Timestamp).toDate(),
            }))
            .filter(expense => {
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
    }, [filters, debouncedSearchQuery, accounts]);

    const filteredSummaryExpenses = useMemo(() => {
        const enriched = enrichAndFilter(summaryExpenses);
        return enriched.map((expense): EnrichedExpense => ({
            ...expense,
            category: expense.categoryId ? categoryMap.get(expense.categoryId) : undefined,
            account: expense.accountId ? accountMap.get(expense.accountId) : undefined,
            tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
        }));
    }, [summaryExpenses, enrichAndFilter, categoryMap, accountMap, tagMap]);

    const filteredAndEnrichedListExpenses = useMemo(() => {
        const enriched = enrichAndFilter(listExpenses);
        
        const transactionsByAccount = enriched.reduce((acc, tx) => {
            if (tx.accountId) {
                if (!acc[tx.accountId]) acc[tx.accountId] = [];
                acc[tx.accountId].push(tx as (Expense & { date: Date}));
            }
            return acc;
        }, {} as Record<string, (Expense & {date: Date})[]>);

        let finalWithBalance: (Expense & {date: Date})[] = [];
        for (const accountId in transactionsByAccount) {
            const accountTransactions = transactionsByAccount[accountId];
            const account = accountMap.get(accountId);
            if (account) {
                accountTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());
                let startingBalance = 0;
                accountTransactions.forEach(tx => {
                    startingBalance += (tx.type === 'income' ? tx.amount : -tx.amount);
                    tx.runningBalance = startingBalance;
                });
                finalWithBalance.push(...accountTransactions);
            }
        }
        
        return finalWithBalance.map((expense): EnrichedExpense => ({
            ...expense,
            category: expense.categoryId ? categoryMap.get(expense.categoryId) : undefined,
            account: expense.accountId ? accountMap.get(expense.accountId) : undefined,
            tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
        })).sort((a, b) => b.date.getTime() - a.date.getTime());

    }, [listExpenses, enrichAndFilter, accountMap, categoryMap, tagMap]);
    
    const handleFiltersChange = (newFilters: Filters) => {
        setFilters(newFilters);
        setDisplayLimit(PAGE_SIZE); 
    };

    const handleBadgeClick = (type: 'category' | 'tag' | 'account', id: string) => {
        setFilters(prev => ({
            ...prev,
            [type === 'category' ? 'categories' : type === 'tag' ? 'tags' : 'accounts']: [id],
            searchQuery: '',
        }));
        setDisplayLimit(PAGE_SIZE);
    };
    
    const handleDeleteSelected = async () => {
        if (!user || !firestore || selectedExpenseIds.length === 0) return;

        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            const accountBalanceUpdates = new Map<string, number>();

            selectedExpenseIds.forEach(id => {
                const expense = filteredAndEnrichedListExpenses.find(e => e.id === id);
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

            accountBalanceUpdates.forEach((change, accountId) => {
                const accountRef = doc(firestore, `users/${user.uid}/accounts`, accountId);
                batch.update(accountRef, { balance: increment(change) });
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

    const hasMore = (listExpenses?.length || 0) >= displayLimit;
    const loadMore = () => setDisplayLimit(prev => prev + PAGE_SIZE);

    return (
        <div className="w-full space-y-4">
            <ExpensesSummary 
                expenses={filteredSummaryExpenses}
                currency={userProfile?.defaultCurrency} 
                isLoading={summaryLoading || profileLoading}
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
                expenses={filteredAndEnrichedListExpenses} 
                isLoading={listLoading && filteredAndEnrichedListExpenses.length === 0} 
                onDataChange={() => setSelectedExpenseIds([])} 
                error={listError ? 'Error loading transactions' : null}
                onBadgeClick={handleBadgeClick}
                selectedIds={selectedExpenseIds}
                onSelectionChange={setSelectedExpenseIds}
                isDeleting={isDeleting}
                onDeleteSelected={handleDeleteSelected}
            />

            <Pagination 
                onLoadMore={loadMore} 
                isLoading={listLoading} 
                hasMore={hasMore} 
            />

             <div className="fixed bottom-6 right-6 z-10 hidden md:flex md:flex-col md:gap-3">
                <AddExpenseDialog initialType="income" onSaveSuccess={() => setSelectedExpenseIds([])}>
                     <Button size="icon" className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg">
                        <Plus className="h-6 w-6" />
                        <span className="sr-only">Add Income</span>
                    </Button>
                </AddExpenseDialog>
                <AddExpenseDialog initialType="expense" onSaveSuccess={() => setSelectedExpenseIds([])}>
                     <Button size="icon" className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg">
                        <Minus className="h-6 w-6" />
                        <span className="sr-only">Add Expense</span>
                    </Button>
                </AddExpenseDialog>
            </div>
        </div>
    );
}

export default function ExpensesPage() {
    return (
        <Suspense fallback={null}>
            <ExpensesPageContent />
        </Suspense>
    );
}
