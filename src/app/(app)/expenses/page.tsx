import { PageHeader } from "@/components/PageHeader";
import { AddExpenseSheet } from "@/components/expenses/AddExpenseSheet";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

const mockExpenses = [
    { id: '1', category: 'Food', amount: 45.50, description: 'Lunch with colleagues', date: new Date('2023-11-20') },
    { id: '2', category: 'Transport', amount: 22.00, description: 'Uber to office', date: new Date('2023-11-20') },
    { id: '3', category: 'Shopping', amount: 150.00, description: 'New jacket', date: new Date('2023-11-19') },
    { id: '4', category: 'Utilities', amount: 75.80, description: 'Electricity bill', date: new Date('2023-11-18') },
]

export default function ExpensesPage() {
    return (
        <div className="space-y-8">
            <PageHeader title="Your Expenses" description="A detailed list of your recent expenses.">
                <AddExpenseSheet>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Expense
                    </Button>
                </AddExpenseSheet>
            </PageHeader>

            <ExpensesTable expenses={mockExpenses} />
        </div>
    );
}
