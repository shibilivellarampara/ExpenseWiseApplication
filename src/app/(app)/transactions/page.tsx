
'use client';

import { PageHeader } from "@/components/PageHeader";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Expense } from "@/lib/types";
import { collection, orderBy, query } from "firebase/firestore";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function TransactionsByMonthPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const expensesQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/expenses`), orderBy('date', 'desc')) : null
    , [firestore, user]);

    const { data: expenses, isLoading } = useCollection<Expense>(expensesQuery);

    const months = useMemo(() => {
        if (!expenses) return [];

        const monthSet = new Set<string>();
        expenses.forEach(expense => {
            const date = (expense.date as any).toDate();
            monthSet.add(format(date, 'yyyy-MM'));
        });

        return Array.from(monthSet).map(monthStr => {
            const [year, month] = monthStr.split('-');
            const date = parseISO(`${monthStr}-01`);
            const total = expenses.filter(e => format((e.date as any).toDate(), 'yyyy-MM') === monthStr).length;
            return {
                key: monthStr,
                display: format(date, 'MMMM yyyy'),
                year,
                month,
                count: total
            };
        });
    }, [expenses]);
    
    return (
        <div className="w-full space-y-8">
            <PageHeader
                title="Transactions by Month"
                description="Select a month to view all its transactions."
            />

            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {months.map(month => (
                         <Link key={month.key} href={`/transactions/${month.year}/${month.month}`} passHref>
                            <Card className="hover:bg-accent transition-colors cursor-pointer">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>{month.display}</CardTitle>
                                        <CardDescription>{month.count} transactions</CardDescription>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
