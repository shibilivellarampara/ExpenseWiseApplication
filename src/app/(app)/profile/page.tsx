'use client';

import { PageHeader } from "@/components/PageHeader";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ExpenseFieldSettings } from "@/components/profile/ExpenseFieldSettings";
import { CategorySettings } from "@/components/profile/CategorySettings";
import { TagSettings } from "@/components/profile/TagSettings";

export default function ProfilePage() {
    return (
        <div className="space-y-8 w-full">
            <PageHeader
                title="Your Profile"
                description="Manage your account settings and preferences."
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-1 space-y-8">
                    <ProfileForm />
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <ExpenseFieldSettings />
                    <CategorySettings />
                    <TagSettings />
                </div>
            </div>
        </div>
    );
}
