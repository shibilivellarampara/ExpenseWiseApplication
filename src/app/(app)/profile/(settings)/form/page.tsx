
'use client';
import { PageHeader } from "@/components/PageHeader";
import { TransactionFieldOrderSettings } from "@/components/profile/TransactionFieldOrderSettings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function FormSettingsPage() {
    return (
        <div className="w-full space-y-8">
             <PageHeader
                title="Form Customization"
                description="Customize transaction form fields."
            >
                 <Button variant="outline" asChild>
                    <Link href="/profile">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Settings
                    </Link>
                </Button>
            </PageHeader>
            <Card>
                <TransactionFieldOrderSettings />
            </Card>
        </div>
    )
}
