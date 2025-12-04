
'use client';

import { PageHeader } from "@/components/PageHeader";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { CategorySettings } from "@/components/profile/CategorySettings";
import { TagSettings } from "@/components/profile/TagSettings";
import { DashboardSettings } from "@/components/profile/DashboardSettings";
import { DataManagementSettings } from "@/components/profile/DataManagementSettings";
import { TransactionFieldOrderSettings } from "@/components/profile/TransactionFieldOrderSettings";
import { AnalysisSettings } from "@/components/profile/AnalysisSettings";

export default function ProfilePage() {
    return (
        <div className="w-full space-y-8">
            <PageHeader
                title="Settings"
                description="Manage your account settings and preferences."
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left Column */}
                <div className="lg:col-span-1 space-y-6">
                    <ProfileForm />
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 space-y-6">
                    <TransactionFieldOrderSettings />
                    <DashboardSettings />
                    <AnalysisSettings />
                    <CategorySettings />
                    <TagSettings />
                </div>
            </div>
            <DataManagementSettings />
        </div>
    );
}
