
'use client';

import { PageHeader } from "@/components/PageHeader";
import { ReportGenerator } from "@/components/reports/ReportGenerator";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Account, Category, EnrichedExpense, Expense, Tag } from "@/lib/types";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useMemo, useState } from "react";

// This function now lives inside the component that uses it
// to simplify data fetching logic for this page.
async function fetchAllTransactions(firestore: any, userId: string, accountId?: string): Promise<Expense[]> {
    let expensesQuery;
    if (accountId && accountId !== 'all') {
        expensesQuery = query(collection(firestore, `users/${userId}/expenses`), where('accountId', '==', accountId));
    } else {
        expensesQuery = query(collection(firestore, `users/${userId}/expenses`));
    }
    const snapshot = await getDocs(expensesQuery);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, date: doc.data().date.toDate() })) as Expense[];
}

export default function ReportsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [transactions, setTransactions] = useState<EnrichedExpense[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const accountsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/accounts`) : null, [user, firestore]);
    const categoriesQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/categories`) : null, [user, firestore]);
    const tagsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/tags`) : null, [user, firestore]);

    const { data: accounts } = useCollection<Account>(accountsQuery);
    const { data: categories } = useCollection<Category>(categoriesQuery);
    const { data: tags } = useCollection<Tag>(tagsQuery);
    
    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(accounts?.map(a => [a.id, a])), [accounts]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);

    const handleGenerate = async (accountId: string, format: 'excel' | 'pdf') => {
        if (!user || !firestore) return;
        setIsLoading(true);

        const rawExpenses = await fetchAllTransactions(firestore, user.uid, accountId);
        
        const enriched = rawExpenses.map((expense: Expense): EnrichedExpense => ({
            ...expense,
            category: categoryMap.get(expense.categoryId || ''),
            account: accountMap.get(expense.accountId),
            tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
        })).sort((a, b) => a.date.getTime() - b.date.getTime());

        setTransactions(enriched);
        setIsLoading(false);
    };

    return (
        <div className="w-full space-y-8">
            <PageHeader
                title="Generate Reports"
                description="Export your transaction data to various formats."
            />
            <ReportGenerator 
                accounts={accounts || []} 
                onGenerate={handleGenerate}
                transactions={transactions}
                isLoading={isLoading}
            />
        </div>
    );
}
