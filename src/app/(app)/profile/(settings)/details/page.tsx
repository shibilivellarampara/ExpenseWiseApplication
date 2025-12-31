
'use client';
import { PageHeader } from "@/components/PageHeader";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProfileDetailsPage() {
    return (
        <div className="w-full space-y-8">
             <PageHeader
                title="Profile & Security"
                description="Update your personal information and password."
            >
                 <Button variant="outline" asChild>
                    <Link href="/profile">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Settings
                    </Link>
                </Button>
            </PageHeader>
            <ProfileForm />
        </div>
    )
}
