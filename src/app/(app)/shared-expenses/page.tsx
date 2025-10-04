'use client';

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function SharedExpensesPage() {
    return (
        <div className="w-full space-y-8">
            <PageHeader title="Shared Expenses" description="Create and manage shared expense ledgers with others.">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Shared Space
                </Button>
            </PageHeader>
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No Shared Spaces Yet</h3>
                <p className="text-muted-foreground mt-2">Click "Create Shared Space" to get started.</p>
            </div>
        </div>
    );
}
