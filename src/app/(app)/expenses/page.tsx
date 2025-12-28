
'use client';

import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { Expense, EnrichedExpense, Category, Account, Tag, UserProfile } from "@/lib/types";
import { collection, orderBy, query, doc, where, Timestamp }from "firebase/firestore";
import { Plus, Minus, ArrowUp, ArrowDown } from "lucide-react";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { ExpensesFilters, DateRange, Filters } from "@/components/expenses/ExpensesFilters";
import { endOfDay, startOfDay } from 'date-fns';
import { ExpensesSummary } from "@/components/expenses/ExpensesSummary";
import { useDebounce } from "use-debounce";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";

export default function ExpensesPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isScrolled, setIsScrolled] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const isMobile = useMediaQuery("(max-width: 768px)");

    const searchParams = useSearchParams();

    const [filters, setFilters] = useState<Filters>({
        dateRange: { from: undefined, to: undefined },
        type: 'all',
        categories: [],
        accounts: [],
        tags: [],
        searchQuery: '',
    });
    
    // Set initial filters from URL params
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

        let clientFiltered = allExpenses
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
            
        // Running balance calculation
        const getAmountChange = (tx: Expense, accType: Account['type']) => {
            if (accType === 'credit_card') {
               return tx.type === 'income' ? tx.amount : -tx.amount;
            }
            return tx.type === 'income' ? tx.amount : -tx.amount;
        };
        
        const transactionsByAccount = clientFiltered.reduce((acc, tx) => {
            if (tx.accountId) {
                if (!acc[tx.accountId]) {
                    acc[tx.accountId] = [];
                }
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
            account: expense.accountId ? accountMap.get(expense.accountId) : undefined,
            tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
        }));

        return enriched.sort((a, b) => b.date.getTime() - a.date.getTime());

    }, [allExpenses, filters, debouncedSearchQuery, categoryMap, accountMap, tagMap, accounts]);
    
     useEffect(() => {
        const mainContentEl = document.getElementById('main-content');

        const handleScroll = () => {
            const el = mainContentEl || window;
            const scrollTop = mainContentEl ? el.scrollTop : window.scrollY;

            setIsScrolled(scrollTop > 10);
            setShowScrollTop(scrollTop > 200);
        };
        
        const targetElement = mainContentEl || window;
        targetElement.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial check

        return () => {
            targetElement.removeEventListener('scroll', handleScroll);
        };
    }, []);

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
    
    const scrollToTop = () => {
        const mainContentEl = document.getElementById('main-content');
        const targetElement = mainContentEl || window;
        targetElement.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const showBottomNav = userProfile?.dashboardSettings?.navigationStyle === 'bottom' && isMobile;


    return (
        <div className="w-full space-y-4 pb-24">
            <ExpensesSummary 
                expenses={filteredAndEnrichedExpenses}
                currency={userProfile?.defaultCurrency} 
                isLoading={isLoading}
                selectedAccount={selectedAccount} 
            />

            <div className={cn(
                "sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 pt-2",
                 isScrolled ? "pb-2 shadow-sm rounded-b-lg" : "pb-0"
            )}>
                 <ExpensesFilters 
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    accounts={accounts || []}
                    categories={categories || []}
                    tags={tags || []}
                />
            </div>
            
            <ExpensesTable 
                expenses={filteredAndEnrichedExpenses} 
                isLoading={isLoading && filteredAndEnrichedExpenses.length === 0} 
                onDataChange={handleDataChange} 
                error={expensesError ? 'Error loading transactions' : null}
                onBadgeClick={handleBadgeClick}
            />

            <div className={cn("fixed left-0 right-0 p-4 z-10 md:hidden", showBottomNav ? 'bottom-20' : 'bottom-4')}>
                <div className="container mx-auto flex flex-col items-center gap-3">
                    <div className="flex gap-3">
                        {showScrollTop && (
                            <Button onClick={scrollToTop} size="icon" variant="outline" className="h-12 w-12 rounded-full shadow-lg">
                                <ArrowUp className="h-6 w-6" />
                                <span className="sr-only">Scroll to top</span>
                            </Button>
                        )}
                    </div>
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
