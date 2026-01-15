
'use client';

import { PageHeader } from '@/components/PageHeader';

export default function BudgetPage() {
    return (
        <div className="w-full space-y-8">
            <PageHeader
                title="Budgets"
                description="Manage your monthly and category-wise budgets."
            />
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">Coming Soon!</h3>
                <p className="text-muted-foreground mt-2">This feature is under construction. You'll soon be able to set and track your budgets here.</p>
            </div>
        </div>
    );
}
