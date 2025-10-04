'use client';

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, LogIn } from "lucide-react";
import { AddSharedExpenseSheet } from "@/components/shared-expenses/AddSharedExpenseSheet";
import { SharedExpensesList } from "@/components/shared-expenses/SharedExpensesList";
import { useUser, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, where, query } from "firebase/firestore";
import { SharedExpense } from "@/lib/types";
import { JoinSharedExpenseDialog } from "@/components/shared-expenses/JoinSharedExpenseDialog";

export default function SharedExpensesPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const sharedExpensesQuery = useMemoFirebase(() =>
        user ? query(collection(firestore, `shared_expenses`), where('memberIds', 'array-contains', user.uid)) : null
    , [user, firestore]);

    const { data: sharedExpenses, isLoading } = useCollection<SharedExpense>(sharedExpensesQuery);

    return (
        <div className="w-full space-y-8">
            <PageHeader title="Shared Expenses" description="Create or join shared expense ledgers with others.">
                <div className="flex gap-2">
                    <JoinSharedExpenseDialog>
                         <Button variant="outline">
                            <LogIn className="mr-2 h-4 w-4" />
                            Join a Space
                        </Button>
                    </JoinSharedExpenseDialog>
                    <AddSharedExpenseSheet>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Shared Space
                        </Button>
                    </AddSharedExpenseSheet>
                </div>
            </PageHeader>
            
            <SharedExpensesList sharedExpenses={sharedExpenses || []} isLoading={isLoading} />
        </div>
    );
}
