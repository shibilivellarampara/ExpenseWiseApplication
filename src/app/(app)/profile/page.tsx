'use client';

import { PageHeader } from "@/components/PageHeader";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { UserSettings } from "@/components/profile/UserSettings";

export default function ProfilePage() {
    return (
        <div className="space-y-8">
            <PageHeader
                title="Your Profile"
                description="Manage your account settings and preferences."
            />
            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-2">
                    <ProfileForm />
                </div>
                <div>
                    <UserSettings />
                </div>
            </div>
        </div>
    );
}
