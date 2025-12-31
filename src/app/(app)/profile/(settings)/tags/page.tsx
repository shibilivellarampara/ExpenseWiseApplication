
'use client';
import { PageHeader } from "@/components/PageHeader";
import { TagSettings } from "@/components/profile/TagSettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TagSettingsPage() {
    return (
        <div className="w-full space-y-8">
             <PageHeader
                title="Tag Settings"
                description="Manage your expense tags/labels."
            >
                 <Button variant="outline" asChild>
                    <Link href="/profile">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Settings
                    </Link>
                </Button>
            </PageHeader>
            <TagSettings />
        </div>
    )
}
