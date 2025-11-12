
'use client';

import { PageHeader } from "@/components/PageHeader";
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { Expense, EnrichedExpense, Category, Account, Tag, UserProfile } from "@/lib/types";
import { collection, orderBy, query, doc, where, getDocs }from "firebase/firestore";
import { Plus, Minus } from "lucide-react";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { ExpensesFilters, DateRange, Filters } from "@/components/expenses/ExpensesFilters";
import { endOfDay, startOfDay, parse } from 'date-fns';
import { ExpensesSummary } from "@/components/expenses/ExpensesSummary";
import { useDebounce } from "use-debounce";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

export default function ExpensesPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const mainContentRef = useRef<HTMLElement | null>(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const searchParams = useSearchParams();

    // Initialize filters from URL search params
    const getInitialFilters = (): Filters => {
        const accountsParam = searchParams.get('accounts');
        const typeParam = searchParams.get('type');
        const categoriesParam = searchParams.get('categories');
        const dateFromParam = searchParams.get('dateFrom');
        const dateToParam = searchParams.get('dateTo');

        const parseDate = (dateStr: string | null) => {
            if (!dateStr) return undefined;
            try {
                return parse(dateStr, 'yyyy-MM-dd', new Date());
            } catch {
                return undefined;
            }
        };

        return {
            dateRange: { from: parseDate(dateFromParam), to: parseDate(dateToParam) },
            type: (typeParam === 'income' || typeParam === 'expense') ? typeParam : 'all',
            categories: categoriesParam ? categoriesParam.split(',') : [] as string[],
            accounts: accountsParam ? accountsParam.split(',') : [] as string[],
            tags: [] as string[],
            searchQuery: '',
        };
    };

    const [filters, setFilters] = useState(getInitialFilters);
    
    const [debouncedSearchQuery] = useDebounce(filters.searchQuery, 300);

    // Queries for filter dropdowns
    const categoriesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/categories`), orderBy('name', 'asc')) : null, [firestore, user]);
    const accountsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/accounts`), orderBy('name', 'asc')) : null, [firestore, user]);
    const tagsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/tags`), orderBy('name', 'asc')) : null, [firestore, user]);
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);

    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);
    const { data: tags, isLoading: tagsLoading } = useCollection<Tag>(tagsQuery);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);
    
    // State for the fetched expenses
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [expensesLoading, setExpensesLoading] = useState(true);
    const [expensesError, setExpensesError] = useState<string | null>(null);


    const fetchExpenses = useCallback(async () => {
        if (!user || !firestore) return;

        setExpensesLoading(true);
        setExpensesError(null);

        try {
            // ** SIMPLIFIED QUERY **
            // Only apply filters that Firestore handles well together: date, type, and a single array-contains.
            let q = query(collection(firestore, `users/${user.uid}/expenses`), orderBy('date', 'desc'));
            
            if (filters.dateRange.from) {
                q = query(q, where('date', '>=', startOfDay(filters.dateRange.from)));
            }
            if (filters.dateRange.to) {
                q = query(q, where('date', '<=', endOfDay(filters.dateRange.to)));
            }
            if (filters.type !== 'all') {
                q = query(q, where('type', '==', filters.type));
            }
            // For tags, we can only do one `array-contains-any`. If needed, we'd have to do client-side.
            // For now, let's keep it simple. If multiple tag filters are needed, logic would change.
            if (filters.tags.length > 0) {
                 q = query(q, where('tagIds', 'array-contains-any', filters.tags));
            }

            const snapshot = await getDocs(q);
            const fetchedExpenses = snapshot.docs.map(doc => {
                 const data = doc.data() as Expense;
                 const date = data.date && typeof (data.date as any).toDate === 'function' 
                    ? (data.date as any).toDate() 
                    : new Date();
                 return { ...data, id: doc.id, date };
            });
            setAllExpenses(fetchedExpenses);

        } catch (error: any) {
            console.error("Error fetching expenses: ", error);
             setExpensesError('Error loading transactions. Check permissions or try simplifying filters.');
        } finally {
            setExpensesLoading(false);
        }
    }, [user, firestore, filters.dateRange, filters.type, filters.tags]);

    // Fetch expenses when filters change
    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);


    useEffect(() => {
        const mainElement = document.querySelector('main');
        mainContentRef.current = mainElement;

        const handleScroll = () => {
            if (mainContentRef.current) {
                setIsScrolled(mainContentRef.current.scrollTop > 5);
            }
        };

        if (mainContentRef.current) {
            mainContentRef.current.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (mainContentRef.current) {
                mainContentRef.current.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);


    const isLoading = expensesLoading || categoriesLoading || accountsLoading || tagsLoading || profileLoading;

    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(accounts?.map(a => [a.id, a])), [accounts]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);
    
    const filteredAndEnrichedExpenses = useMemo(() => {
        if (!allExpenses.length || !accounts?.length) return [];
        
        let clientFiltered = allExpenses.filter(expense => {
            // ** CLIENT-SIDE FILTERING for accounts and categories **
            if (filters.accounts.length > 0 && !filters.accounts.includes(expense.accountId)) {
                return false;
            }
            if (filters.categories.length > 0 && !filters.categories.includes(expense.categoryId || '')) {
                return false;
            }
            if (debouncedSearchQuery) {
                const lowerCaseQuery = debouncedSearchQuery.toLowerCase();
                const descriptionMatch = expense.description?.toLowerCase().includes(lowerCaseQuery);
                const amountMatch = String(expense.amount).includes(lowerCaseQuery);
                if (!descriptionMatch && !amountMatch) {
                    return false;
                }
            }
            return true;
        });
        
        // Running balance calculation remains the same
        const getAmountChange = (tx: Expense, accType: Account['type']) => {
            if (accType === 'credit_card') {
               return tx.type === 'income' ? tx.amount : -tx.amount;
            }
            return tx.type === 'income' ? tx.amount : -tx.amount;
        };
        
        const transactionsByAccount = clientFiltered.reduce((acc, tx) => {
            if (!acc[tx.accountId]) {
                acc[tx.accountId] = [];
            }
            acc[tx.accountId].push(tx);
            return acc;
        }, {} as Record<string, Expense[]>);

        let finalWithBalance: Expense[] = [];

        for (const accountId in transactionsByAccount) {
            const accountTransactions = transactionsByAccount[accountId];
            const account = accountMap.get(accountId);

            if (account) {
                accountTransactions.sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
                
                const oldestVisibleDate = accountTransactions.length > 0 ? (accountTransactions[0].date as Date) : new Date();
                
                const priorTransactions = allExpenses.filter(tx => 
                    tx.accountId === accountId && (tx.date as Date) < oldestVisibleDate
                );

                let startingBalance: number;
                if (account.type === 'credit_card') {
                    const priorBalanceChange = priorTransactions.reduce((sum, tx) => sum + getAmountChange(tx, account.type), 0);
                    startingBalance = (account.limit || 0) + priorBalanceChange;
                } else {
                    startingBalance = priorTransactions.reduce((sum, tx) => sum + getAmountChange(tx, account.type), 0);
                }

                accountTransactions.forEach(tx => {
                    const amountChange = getAmountChange(tx, account.type);
                    startingBalance += amountChange;
                    tx.runningBalance = startingBalance;
                });
                
                finalWithBalance.push(...accountTransactions);
            }
        }
        
        let enriched = finalWithBalance.map((expense): EnrichedExpense => ({
            ...expense,
            date: expense.date, // Already a Date object
            category: expense.categoryId ? categoryMap.get(expense.categoryId) : undefined,
            account: accountMap.get(expense.accountId),
            tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
        }));

        return enriched.sort((a, b) => b.date.getTime() - a.date.getTime());

    }, [allExpenses, categoryMap, accountMap, tagMap, debouncedSearchQuery, accounts, filters.accounts, filters.categories]);
    
    const handleFiltersChange = (newFilters: Filters) => {
        setFilters(newFilters);
    };

    return (
        <div className="w-full space-y-4 pb-24">
            <div
                className={cn(
                    "transition-all duration-300 ease-in-out",
                    isScrolled ? "max-h-0 opacity-0 overflow-hidden" : "max-h-96 opacity-100"
                )}
            >
                <PageHeader title="Transactions" description="A detailed list of your recent income and expenses." />
            </div>

            <div className={cn(
                "sticky -top-4 md:-top-6 lg:-top-8 z-20 bg-background/95 backdrop-blur-sm transition-all duration-300 ease-in-out",
                 isScrolled && "pt-4 pb-3 shadow-sm rounded-b-lg"
            )}>
                <div className="space-y-4">
                     <ExpensesSummary 
                        expenses={filteredAndEnrichedExpenses}
                        currency={userProfile?.defaultCurrency} 
                        isLoading={isLoading} 
                    />
                    <ExpensesFilters 
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                        accounts={accounts || []}
                        categories={categories || []}
                        tags={tags || []}
                    />
                </div>
            </div>
            
            <ExpensesTable 
                expenses={filteredAndEnrichedExpenses} 
                isLoading={isLoading && filteredAndEnrichedExpenses.length === 0} 
                onDataChange={fetchExpenses} 
                error={expensesError}
            />

            <div className="fixed bottom-0 left-0 right-0 p-4 z-40 md:hidden">
                 <div className="container mx-auto flex justify-around gap-2">
                    <AddExpenseDialog initialType="income" onSaveSuccess={fetchExpenses}>
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg text-base font-semibold py-6">
                            <Plus className="mr-2 h-5 w-5" />
                            CASH IN
                        </Button>
                    </AddExpenseDialog>
                    <AddExpenseDialog initialType="expense" onSaveSuccess={fetchExpenses}>
                        <Button className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg text-base font-semibold py-6">
                            <Minus className="mr-2 h-5 w-5" />
                            CASH OUT
                        </Button>
                    </AddExpenseDialog>
                </div>
            </div>

             <div className="fixed bottom-6 right-6 z-40 hidden md:flex md:flex-col md:gap-3">
                <AddExpenseDialog initialType="income" onSaveSuccess={fetchExpenses}>
                     <Button size="icon" className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg">
                        <Plus className="h-6 w-6" />
                        <span className="sr-only">Add Income</span>
                    </Button>
                </AddExpenseDialog>
                <AddExpenseDialog initialType="expense" onSaveSuccess={fetchExpenses}>
                     <Button size="icon" className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg">
                        <Minus className="h-6 w-6" />
                        <span className="sr-only">Add Expense</span>
                    </Button>
                </AddExpenseDialog>
            </div>
        </div>
    );
}
