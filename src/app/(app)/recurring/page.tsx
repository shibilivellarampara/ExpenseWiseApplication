'use client';

import { PageHeader } from '@/components/PageHeader';

export default function RecurringPage() {
    return (
        <div className="w-full space-y-8">
            <PageHeader
                title="Recurring Transactions"
                description="Manage your subscriptions and recurring bills."
            />
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">Coming Soon!</h3>
                <p className="text-muted-foreground mt-2">This feature is under construction. You'll soon be able to manage all your recurring payments here.</p>
            </div>
        </div>
    );
}
