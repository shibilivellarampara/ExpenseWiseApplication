import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Contribution {
    id: string;
    description: string;
    totalAmount: number;
    date: Date;
    paidBy: string;
}

interface ContributionsListProps {
    contributions: Contribution[];
}

export function ContributionsList({ contributions }: ContributionsListProps) {
    if (contributions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No Shared Expenses Yet</h3>
                <p className="text-muted-foreground mt-2">Click "Add Shared Expense" to get started.</p>
            </div>
        );
    }
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contributions.map(item => (
                <Card key={item.id}>
                    <CardHeader>
                        <CardTitle>{item.description}</CardTitle>
                        <CardDescription>{item.date.toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">${item.totalAmount.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" className="w-full">View Details</Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}
