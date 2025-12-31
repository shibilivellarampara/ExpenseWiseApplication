
'use client';
import { PageHeader } from "@/components/PageHeader";
import { DashboardSettings } from "@/components/profile/DashboardSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DashboardSettingsPage() {
    return (
        <div className="w-full space-y-8">
             <PageHeader
                title="Dashboard Settings"
                description="Customize your dashboard appearance."
            >
                 <Button variant="outline" asChild>
                    <Link href="/profile">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Settings
                    </Link>
                </Button>
            </PageHeader>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Chart Settings</CardTitle>
                </CardHeader>
                <DashboardSettings />
            </Card>
        </div>
    )
}
