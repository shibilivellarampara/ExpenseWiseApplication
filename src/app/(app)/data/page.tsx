

'use client';

import { PageHeader } from "@/components/PageHeader";
import { ReportGenerator } from "@/components/reports/ReportGenerator";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Account, Category, EnrichedExpense, Expense, Tag } from "@/lib/types";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { useMemo, useState } from "react";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { ExcelImporter } from "@/components/import/ExcelImporter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

async function fetchAllTransactions(firestore: any, userId: string, accountId?: string): Promise<Expense[]> {
    let expensesQuery;
    if (accountId && accountId !== 'all') {
        expensesQuery = query(collection(firestore, `users/${userId}/expenses`), where('accountId', '==', accountId));
    } else {
        expensesQuery = query(collection(firestore, `users/${userId}/expenses`));
    }
    const snapshot = await getDocs(expensesQuery);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            ...data, 
            id: doc.id, 
            date: (data.date as Timestamp)
        } as Expense;
    });
}

export default function DataPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
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

    const handleReportAction = async (accountId: string, format: 'excel' | 'share', template: string) => {
        if (!user || !firestore) return;
        setIsLoading(true);
        setProgress(0);

        try {
            setProgress(10);
            const rawExpenses = await fetchAllTransactions(firestore, user.uid, accountId);
            setProgress(30);
            
            if (rawExpenses.length === 0) {
                toast({
                    title: "No Data",
                    description: "There are no transactions for the selected account in this period.",
                });
                setIsLoading(false);
                setProgress(0);
                return;
            }
            
            const enriched = rawExpenses.map((expense: Expense): EnrichedExpense => ({
                ...expense,
                date: expense.date.toDate(),
                category: categoryMap.get(expense.categoryId || ''),
                account: accountMap.get(expense.accountId),
                tags: expense.tagIds?.map(tagId => tagMap.get(tagId)).filter(Boolean) as Tag[] || [],
            })).sort((a, b) => a.date.getTime() - b.date.getTime());

            setProgress(60);

            let dataToExport;
            
            if (template === 'expensewise') {
                 dataToExport = enriched.map(tx => ({
                    'Date': tx.date.toLocaleDateString(),
                    'Time': tx.date.toLocaleTimeString(),
                    'Description': tx.description,
                    'Category': tx.category?.name || 'N/A',
                    'Account': tx.account?.name || 'N/A',
                    'Amount': tx.amount,
                    'Type': tx.type,
                    'Tags': tx.tags.map(t => t.name).join(', '),
                }));
            } else { // Enhanced template
                dataToExport = enriched.map(tx => ({
                    'Date': tx.date.toLocaleDateString(),
                    'Time': tx.date.toLocaleTimeString(),
                    'Description': tx.description,
                    'Category': tx.category?.name || 'N/A',
                    'ACCOUNT': tx.account?.name || 'N/A',
                    'CASH IN': tx.type === 'income' ? tx.amount : '',
                    'CASH OUT': tx.type === 'expense' ? tx.amount : '',
                    'Tags': tx.tags.map(t => t.name).join(', '),
                }));
            }

            setProgress(80);

            if (format === 'excel') {
                const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
                XLSX.writeFile(workbook, `ExpenseWise_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            } else if (format === 'share') {
                const headers = Object.keys(dataToExport[0]).join('\t');
                const rows = dataToExport.map(row => Object.values(row).join('\t')).join('\n');
                const shareText = `${headers}\n${rows}`;
                
                try {
                    if (navigator.share) {
                        await navigator.share({
                            title: 'ExpenseWise Report',
                            text: shareText,
                        });
                        toast({
                            title: "Shared Successfully",
                        });
                    } else {
                         toast({
                            variant: 'destructive',
                            title: "Share Not Supported",
                            description: "Your browser does not support the Web Share API.",
                        });
                    }
                } catch (shareError: any) {
                    if (shareError.name !== 'AbortError') { // Don't show error if user cancels share
                        toast({ variant: 'destructive', title: "Error Sharing", description: shareError.message });
                    }
                }
            }
            
            setProgress(100);

        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error Generating Report", description: error.message });
        } finally {
            setTimeout(() => {
                setIsLoading(false);
                setProgress(0);
            }, 500); // Keep progress bar visible for a moment
        }
    };

    return (
        <div className="w-full space-y-8">
            <PageHeader
                title="Import & Export"
                description="Manage your expense data by importing or exporting."
            />
            <Tabs defaultValue="import" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="import">Import</TabsTrigger>
                    <TabsTrigger value="export">Export</TabsTrigger>
                </TabsList>
                <TabsContent value="import" className="mt-6">
                    <ExcelImporter />
                </TabsContent>
                <TabsContent value="export" className="mt-6">
                    <ReportGenerator 
                        accounts={accounts || []} 
                        onAction={handleReportAction}
                        isLoading={isLoading}
                        progress={progress}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
