
'use client';

import { PageHeader } from "@/components/PageHeader";
import { ReportGenerator } from "@/components/reports/ReportGenerator";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Account, Category, EnrichedExpense, Expense, Tag } from "@/lib/types";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useMemo, useState } from "react";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";

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
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const accountsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/accounts`) : null, [user, firestore]);
    const categoriesQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/categories`) : null, [user, firestore]);
    const tagsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/tags`) : null, [user, firestore]);

    const { data: accounts } = useCollection<Account>(accountsQuery);
    const { data: categories } = useCollection<Category>(categoriesQuery);
    const { data: tags } = useCollection<Tag>(tagsQuery);
    
    const categoryMap = useMemo(() => new Map(categories?.map(c => [c.id, c])), [categories]);
    const accountMap = useMemo(() => new Map(accounts?.map(a => [a.id, a])), [accounts]);
    const tagMap = useMemo(() => new Map(tags?.map(t => [t.id, t])), [tags]);

    const handleDownload = async (accountId: string, format: 'excel' | 'pdf') => {
        if (!user || !firestore) return;
        setIsLoading(true);

        try {
            const rawExpenses = await fetchAllTransactions(firestore, user.uid, accountId);
            
            if (rawExpenses.length === 0) {
                toast({
                    title: "No Data",
                    description: "There are no transactions for the selected account in this period.",
                });
                setIsLoading(false);
                return;
            }
            
            const enriched = rawExpenses.map((expense: Expense): EnrichedExpense => ({
                ...expense,
                date: expense.date as Date,
                category: categoryMap.get(expense.categoryId || ''),
                account: accountMap.get(expense.accountId),
                tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
            })).sort((a, b) => a.date.getTime() - b.date.getTime());

            if (format === 'excel') {
                const dataToExport = enriched.map(tx => ({
                    Date: tx.date.toLocaleDateString(),
                    Time: tx.date.toLocaleTimeString(),
                    Description: tx.description,
                    Category: tx.category?.name || 'N/A',
                    Account: tx.account?.name || 'N/A',
                    Amount: tx.amount,
                    Type: tx.type,
                    Tags: tx.tags.map(t => t.name).join(', '),
                }));

                const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
                XLSX.writeFile(workbook, `ExpenseWise_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            }
            // PDF logic would go here in the future

        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error Generating Report", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full space-y-8">
            <PageHeader
                title="Generate Reports"
                description="Export your transaction data to various formats."
            />
            <ReportGenerator 
                accounts={accounts || []} 
                onDownload={handleDownload}
                isLoading={isLoading}
            />
        </div>
    );
}
