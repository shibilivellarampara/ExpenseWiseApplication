
'use client';

import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { Expense, EnrichedExpense, Category, Account, Tag, UserProfile } from "@/lib/types";
import { collection, orderBy, query, doc, where, Timestamp }from "firebase/firestore";
import { Plus, Minus } from "lucide-react";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { ExpensesFilters, DateRange, Filters } from "@/components/expenses/ExpensesFilters";
import { endOfDay, startOfDay } from 'date-fns';
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

    const [filters, setFilters] = useState<Filters>(() => {
        const accountId = searchParams.get('accounts');
        const type = searchParams.get('type') as 'all' | 'income' | 'expense' | null;

        return {
            dateRange: { from: undefined, to: undefined },
            type: type || 'all',
            categories: [],
            accounts: accountId ? [accountId] : [],
            tags: [],
            searchQuery: '',
            billingCycle: undefined,
        };
    });
    
    const [debouncedSearchQuery] = useDebounce(filters.searchQuery, 300);

    const expensesQuery = useMemoFirebase(() => {
        if (!user) return null;

        let q = query(collection(firestore, `users/${user.uid}/expenses`), orderBy('date', 'desc'));
        // If a billing cycle is active, its date range takes precedence.
        // Otherwise, use the manual date range filter.
        if (!filters.billingCycle) {
            if (filters.dateRange.from) {
                q = query(q, where('date', '>=', Timestamp.fromDate(startOfDay(filters.dateRange.from))));
            }
            if (filters.dateRange.to) {
                q = query(q, where('date', '<=', Timestamp.fromDate(endOfDay(filters.dateRange.to))));
            }
        }
        
        return q;
    }, [user, firestore, filters.dateRange, filters.billingCycle]);
    
    // Queries for filter dropdowns
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
        // This is a placeholder for the ExpensesTable. Data is re-fetched automatically by useCollection.
    }, []);

    useEffect(() => {
        // Use the new ID to find the main scrollable element
        const mainElement = document.getElementById('main-content');
        mainContentRef.current = mainElement;

        const handleScroll = () => {
            if (mainContentRef.current) {
                // Adjust this threshold as needed
                setIsScrolled(mainContentRef.current.scrollTop > 1);
            }
        };

        if (mainContentRef.current) {
            mainContentRef.current.addEventListener('scroll', handleScroll);
        }

        // Cleanup function
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
        if (!allExpenses || !accounts) return [];

        let clientFiltered = allExpenses
            .map(expense => ({
                ...expense,
                date: (expense.date as Timestamp).toDate(),
            }))
            .filter(expense => {
                 // Billing cycle filter application
                if (filters.billingCycle && filters.dateRange.from && filters.dateRange.to) {
                     if (expense.date < startOfDay(filters.dateRange.from) || expense.date > endOfDay(filters.dateRange.to)) {
                        return false;
                    }
                }
                if (filters.type !== 'all' && expense.type !== filters.type) return false;
                if (filters.accounts.length > 0 && !filters.accounts.includes(expense.accountId)) return false;
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
            
        // Running balance calculation
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
            acc[tx.accountId].push(tx as (Expense & { date: Date}));
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
                    const amountChange = getAmountChange(tx, account.type);
                    startingBalance += amountChange;
                    tx.runningBalance = startingBalance;
                });
                
                finalWithBalance.push(...accountTransactions);
            }
        }
        
        let enriched = finalWithBalance.map((expense): EnrichedExpense => ({
            ...expense,
            category: expense.categoryId ? categoryMap.get(expense.categoryId) : undefined,
            account: accountMap.get(expense.accountId),
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


    return (
        <div className="w-full space-y-4 pb-24">
            <div className={cn(
                "sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 -mt-4 px-4 pt-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8",
                 isScrolled && "pb-3 shadow-sm rounded-b-lg"
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
                onDataChange={handleDataChange} 
                error={expensesError ? 'Error loading transactions' : null}
                onBadgeClick={handleBadgeClick}
            />

            <div className="fixed bottom-0 left-0 right-0 p-4 z-10 md:hidden">
                 <div className="container mx-auto flex justify-around gap-2">
                    <AddExpenseDialog initialType="income" onSaveSuccess={handleDataChange}>
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg text-base font-semibold py-6">
                            <Plus className="mr-2 h-5 w-5" />
                            CASH IN
                        </Button>
                    </AddExpenseDialog>
                    <AddExpenseDialog initialType="expense" onSaveSuccess={handleDataChange}>
                        <Button className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg text-base font-semibold py-6">
                            <Minus className="mr-2 h-5 w-5" />
                            CASH OUT
                        </Button>
                    </AddExpenseDialog>
                </div>
            </div>

             <div className="fixed bottom-6 right-6 z-10 hidden md:flex md:flex-col md:gap-3">
                <AddExpenseDialog initialType="income" onSaveSuccess={handleDataChange}>
                     <Button size="icon" className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg">
                        <Plus className="h-6 w-6" />
                        <span className="sr-only">Add Income</span>
                    </Button>
                </AddExpenseDialog>
                <AddExpenseDialog initialType="expense" onSaveSuccess={handleDataChange}>
                     <Button size="icon" className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg">
                        <Minus className="h-6 w-6" />
                        <span className="sr-only">Add Expense</span>
                    </Button>
                </AddExpenseDialog>
            </div>
        </div>
    );
}
