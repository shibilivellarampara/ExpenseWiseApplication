

'use client';

import { PageHeader } from "@/components/PageHeader";
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { Expense, EnrichedExpense, Category, Account, Tag, UserProfile, SharedExpense } from "@/lib/types";
import { collection, orderBy, query, doc, getDocs, where, Timestamp } from "firebase/firestore";
import { PlusCircle } from "lucide-react";
import { useMemo, useEffect, useState, useCallback } from "react";
import { useParams } from 'next/navigation';

export default function SharedExpenseDetailPage() {
    const params = useParams();
    const { user } = useUser();
    const firestore = useFirestore();
    const sharedExpenseId = params.id as string;

    // --- Data Fetching ---
    
    // Shared Expense Details
    const sharedExpenseRef = useMemoFirebase(() => 
        firestore && sharedExpenseId ? doc(firestore, `shared_expenses`, sharedExpenseId) : null
    , [firestore, sharedExpenseId]);
    const { data: sharedExpense, isLoading: sharedExpenseLoading, error: sharedExpenseError } = useDoc<SharedExpense>(sharedExpenseRef);

    // Expenses for this shared space
    const expensesQuery = useMemoFirebase(() => 
        firestore && sharedExpenseId ? query(collection(firestore, `shared_expenses/${sharedExpenseId}/expenses`), orderBy('date', 'desc')) : null
    , [firestore, sharedExpenseId]);
    const { data: expenses, isLoading: expensesLoading, error: expensesError } = useCollection<Expense>(expensesQuery);

    const categoriesQuery = useMemoFirebase(() => sharedExpenseId ? collection(firestore, `shared_expenses/${sharedExpenseId}/categories`) : null, [firestore, sharedExpenseId]);
    const tagsQuery = useMemoFirebase(() => sharedExpenseId ? collection(firestore, `shared_expenses/${sharedExpenseId}/tags`) : null, [firestore, sharedExpenseId]);

    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
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
            
            const memberIds = sharedExpense.memberIds;
            const profilesToFetch = memberIds.filter(id => !memberProfiles.has(id));

            if (profilesToFetch.length === 0) {
                setMembersLoading(false);
                return;
            }

            try {
                 const usersRef = collection(firestore, 'users');
                 // Firestore 'in' query is limited to 30 items. If more members, we need to batch.
                 const batches = [];
                 for(let i = 0; i < profilesToFetch.length; i += 30) {
                     batches.push(profilesToFetch.slice(i, i + 30));
                 }
                 
                 const userDocs = await Promise.all(
                    profilesToFetch.map(id => getDoc(doc(usersRef, id)))
                 );

                 const newProfiles = new Map(memberProfiles);
                 userDocs.forEach(docSnap => {
                     if (docSnap.exists()) {
                         newProfiles.set(docSnap.id, docSnap.data() as UserProfile);
                     }
                 });
                setMemberProfiles(newProfiles);
            } catch (error) {
                console.error("Failed to fetch member profiles:", error)
            } finally {
                setMembersLoading(false);
            }
        };

        fetchMemberProfiles();
    }, [firestore, sharedExpense, memberProfiles]);

    const handleDataChange = useCallback(() => {
        // This function is a placeholder to satisfy the prop requirement.
        // The real-time listener already handles updates automatically.
    }, []);


    const isLoading = expensesLoading || categoriesLoading || tagsLoading || sharedExpenseLoading || membersLoading;

    // --- Data Enrichment ---
    
    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);
    
    const enrichedExpenses = useMemo((): EnrichedExpense[] => {
        if (!expenses) return [];
    
        return expenses.map(expense => {
             return {
                ...expense,
                date: (expense.date as Timestamp).toDate(),
                category: categoryMap.get(expense.categoryId ?? ''),
                tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
                user: memberProfiles.get(expense.userId), // Attach user profile who created it
            };
        }).sort((a, b) => b.date.getTime() - a.date.getTime()); // Ensure final sort
    
    }, [expenses, categoryMap, tagMap, memberProfiles]);
    
    const error = sharedExpenseError || expensesError;

    return (
        <div className="w-full space-y-8">
            <PageHeader 
                title={sharedExpense?.name || "Shared Space"} 
                description="A detailed list of transactions in this shared space."
            >
                <AddExpenseDialog sharedExpenseId={sharedExpenseId} onSaveSuccess={handleDataChange}>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Transaction
                    </Button>
                </AddExpenseDialog>
            </PageHeader>

            <ExpensesTable 
                expenses={enrichedExpenses} 
                isLoading={isLoading} 
                isShared={true} 
                onDataChange={handleDataChange}
                error={error ? 'Error loading transactions. Check permissions or network.' : null}
            />
        </div>
    );
}
