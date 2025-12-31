
'use client';
import { PageHeader } from "@/components/PageHeader";
import { AnalysisSettings } from "@/components/profile/AnalysisSettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AnalysisSettingsPage() {
    return (
        <div className="w-full space-y-8">
             <PageHeader
                title="Analysis Settings"
                description="Customize which categories to exclude from your analysis."
            >
                 <Button variant="outline" asChild>
                    <Link href="/profile">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Settings
                    </Link>
                </Button>
            </PageHeader>
            <AnalysisSettings />
        </div>
    )
}
