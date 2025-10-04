import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ContributionsList } from "@/components/contributions/ContributionsList";
import { AddContributionSheet } from "@/components/contributions/AddContributionSheet";

const mockContributions = [
    { id: '1', description: 'Team Dinner', totalAmount: 120, date: new Date('2023-11-15'), paidBy: 'user1' },
    { id: '2', description: 'Weekend Trip Gas', totalAmount: 80, date: new Date('2023-11-10'), paidBy: 'user2' },
]

export default function ContributionsPage() {
    return (
        <div className="space-y-8">
            <PageHeader title="Shared Expenses" description="Track expenses shared with friends and family.">
                <AddContributionSheet>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Shared Expense
                    </Button>
                </AddContributionSheet>
            </PageHeader>
            <ContributionsList contributions={mockContributions} />
        </div>
    );
}
