import { PageHeader } from "@/components/PageHeader";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default function ProfilePage() {
    return (
        <div className="space-y-8">
            <PageHeader
                title="Your Profile"
                description="Manage your account settings and preferences."
            />
            <ProfileForm />
        </div>
    );
}
