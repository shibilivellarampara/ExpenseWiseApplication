
'use client';
import { PageHeader } from "@/components/PageHeader";
import { DataManagementSettings } from "@/components/profile/DataManagementSettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DataManagementPage() {
    return (
        <div className="w-full space-y-8">
             <PageHeader
                title="Data Management"
                description="Reset or delete your account data."
            >
                 <Button variant="outline" asChild>
                    <Link href="/profile">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Settings
                    </Link>
                </Button>
            </PageHeader>
            <DataManagementSettings />
        </div>
    )
}
