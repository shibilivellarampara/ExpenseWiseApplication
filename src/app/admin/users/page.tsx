'use client';

import { PageHeader } from "@/components/PageHeader";
import { UsersTable } from "@/components/admin/UsersTable";
import { useCollection, useFirestore } from "@/firebase";
import { UserProfile } from "@/lib/types";
import { collection } from "firebase/firestore";

export default function UserManagementPage() {
    const firestore = useFirestore();
    const { data: users, isLoading } = useCollection<UserProfile>(collection(firestore, 'users'));

    return (
        <div className="w-full space-y-8">
            <PageHeader
                title="User Management"
                description="View and manage all users of the ExpenseWise application."
            />
            <UsersTable users={users || []} isLoading={isLoading} />
        </div>
    );
}
