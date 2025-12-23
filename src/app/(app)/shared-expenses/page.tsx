
'use client';

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { SharedExpense } from "@/lib/types";
import { collection, query, where } from "firebase/firestore";
import { PlusCircle } from "lucide-react";
import { AddSharedExpenseSheet } from "@/components/shared-expenses/AddSharedExpenseSheet";
import { JoinSharedExpenseDialog } from "@/components/shared-expenses/JoinSharedExpenseDialog";
import { SharedExpensesList } from "@/components/shared-expenses/SharedExpensesList";

export default function SharedExpensesPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const sharedExpensesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `shared_expenses`), where('memberIds', 'array-contains', user.uid));
    }, [user, firestore]);

    const { data: sharedExpenses, isLoading } = useCollection<SharedExpense>(sharedExpensesQuery);

    return (
        <div className="w-full space-y-8">
            <PageHeader title="Shared Expenses" description="Manage your shared expense ledgers with friends and family.">
                <div className="flex items-center gap-2">
                    <JoinSharedExpenseDialog>
                         <Button variant="outline">
                            Join Existing
                        </Button>
                    </JoinSharedExpenseDialog>
                    <AddSharedExpenseSheet>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create New
                        </Button>
                    </AddSharedExpenseSheet>
                </div>
            </PageHeader>

            <SharedExpensesList sharedExpenses={sharedExpenses || []} isLoading={isLoading} />
        </div>
    );
}
