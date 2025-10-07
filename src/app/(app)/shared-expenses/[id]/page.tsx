
'use client';

import { PageHeader } from "@/components/PageHeader";
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { Expense, EnrichedExpense, Category, Account, Tag, UserProfile, SharedExpense } from "@/lib/types";
import { collection, orderBy, query, doc, getDocs, where } from "firebase/firestore";
import { PlusCircle } from "lucide-react";
import { useMemo, useEffect, useState } from "react";

export default function SharedExpenseDetailPage({ params }: { params: { id: string } }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const sharedExpenseId = params.id;

    // --- Data Fetching ---
    
    // Shared Expense Details
    const sharedExpenseRef = useMemoFirebase(() => 
        firestore ? doc(firestore, `shared_expenses`, sharedExpenseId) : null
    , [firestore, sharedExpenseId]);
    const { data: sharedExpense, isLoading: sharedExpenseLoading } = useDoc<SharedExpense>(sharedExpenseRef);

    // Expenses for this shared space
    const expensesQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, `shared_expenses/${sharedExpenseId}/expenses`), orderBy('date', 'desc')) : null
    , [firestore, sharedExpenseId]);
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);

    // All necessary user data (categories, tags, accounts of the current user)
    const categoriesQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/categories`) : null, [firestore, user]);
    const accountsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/accounts`) : null, [firestore, user]);
    const tagsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/tags`) : null, [firestore, user]);

    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);
    const { data: tags, isLoading: tagsLoading } = useCollection<Tag>(tagsQuery);
    
    // State to hold member profile data
    const [memberProfiles, setMemberProfiles] = useState<Map<string, UserProfile>>(new Map());
    const [membersLoading, setMembersLoading] = useState(true);

    // Fetch member profiles when sharedExpense details are available
    useEffect(() => {
        const fetchMemberProfiles = async () => {
            if (!firestore || !sharedExpense || sharedExpense.memberIds.length === 0) {
                 if (sharedExpense) setMembersLoading(false);
                 return;
            }
            setMembersLoading(true);
            const profiles = new Map<string, UserProfile>();
            const memberIds = sharedExpense.memberIds;
            
            // To fetch multiple documents efficiently, we can use a `where` clause with `in` operator
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('id', 'in', memberIds));
            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach(doc => {
                profiles.set(doc.id, doc.data() as UserProfile);
            });

            setMemberProfiles(profiles);
            setMembersLoading(false);
        };

        fetchMemberProfiles();
    }, [firestore, sharedExpense]);


    const isLoading = expensesLoading || categoriesLoading || accountsLoading || tagsLoading || sharedExpenseLoading || membersLoading;

    // --- Data Enrichment ---
    
    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(accounts?.map(p => [p.id, p])), [accounts]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);
    
    const enrichedExpenses = useMemo((): EnrichedExpense[] => {
        if (!expenses) return [];
    
        return expenses.map(expense => {
             return {
                ...expense,
                date: expense.date.toDate(),
                category: categoryMap.get(expense.categoryId ?? ''),
                account: accountMap.get(expense.accountId),
                tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
                user: memberProfiles.get(expense.userId), // Attach user profile who created it
            };
        }).sort((a, b) => b.date.getTime() - a.date.getTime()); // Ensure final sort
    
    }, [expenses, categoryMap, accountMap, tagMap, memberProfiles]);

    return (
        <div className="w-full space-y-8">
            <PageHeader 
                title={sharedExpense?.name || "Shared Space"} 
                description="A detailed list of transactions in this shared space."
            >
                <AddExpenseDialog sharedExpenseId={sharedExpenseId}>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Transaction
                    </Button>
                </AddExpenseDialog>
            </PageHeader>

            <ExpensesTable expenses={enrichedExpenses} isLoading={isLoading} isShared={true} />
        </div>
    );
}
