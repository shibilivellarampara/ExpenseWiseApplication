
'use client';
import { PageHeader } from "@/components/PageHeader";
import { CategorySettings } from "@/components/profile/CategorySettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CategorySettingsPage() {
    return (
        <div className="w-full space-y-8">
             <PageHeader
                title="Category Settings"
                description="Manage your expense categories."
            >
                 <Button variant="outline" asChild>
                    <Link href="/profile">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Settings
                    </Link>
                </Button>
            </PageHeader>
            <CategorySettings />
        </div>
    )
}
