'use client';

import { PageHeader } from "@/components/PageHeader";

export default function AdminDashboardPage() {
    return (
        <div className="w-full space-y-8">
            <PageHeader
                title="Admin Dashboard"
                description="Welcome to the admin dashboard. Manage your application from here."
            />
             {/* Admin specific components and data will go here */}
        </div>
    );
}
