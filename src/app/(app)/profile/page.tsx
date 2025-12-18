
'use client';

import { PageHeader } from "@/components/PageHeader";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { CategorySettings } from "@/components/profile/CategorySettings";
import { TagSettings } from "@/components/profile/TagSettings";
import { DashboardSettings } from "@/components/profile/DashboardSettings";
import { DataManagementSettings } from "@/components/profile/DataManagementSettings";
import { TransactionFieldOrderSettings } from "@/components/profile/TransactionFieldOrderSettings";
import { AnalysisSettings } from "@/components/profile/AnalysisSettings";
import { Card, CardHeader, CardContent, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
    return (
        <div className="w-full space-y-8">
            <PageHeader
                title="Settings"
                description="Manage your account settings and preferences."
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1 space-y-6">
                    <ProfileForm />
                </div>

                <div className="lg:col-span-2 space-y-6">
                     <Card>
                        <Collapsible defaultOpen={false}>
                            <CollapsibleTrigger asChild>
                                <CardHeader className="flex flex-row items-center justify-between cursor-pointer p-4">
                                    <div>
                                        <h3 className="text-base font-semibold font-headline">Form Customization</h3>
                                        <CardDescription className="text-sm">Customize transaction form fields.</CardDescription>
                                    </div>
                                    <ChevronDown className="h-5 w-5 transition-transform [&[data-state=open]]:-rotate-180" />
                                </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <CardContent className="p-4 pt-0">
                                    <TransactionFieldOrderSettings />
                                </CardContent>
                            </CollapsibleContent>
                        </Collapsible>
                    </Card>
                    <Card>
                        <Collapsible>
                            <CollapsibleTrigger asChild>
                                <CardHeader className="flex flex-row items-center justify-between cursor-pointer p-4">
                                    <div>
                                        <h3 className="text-base font-semibold font-headline">Dashboard Settings</h3>
                                        <CardDescription className="text-sm">Customize your dashboard appearance.</CardDescription>
                                    </div>
                                     <ChevronDown className="h-5 w-5 transition-transform [&[data-state=open]]:-rotate-180" />
                                </CardHeader>
                            </CollapsibleTrigger>
                             <CollapsibleContent>
                                <CardContent className="p-4 pt-0">
                                    <DashboardSettings />
                                </CardContent>
                            </CollapsibleContent>
                        </Collapsible>
                    </Card>
                    <AnalysisSettings />
                    <CategorySettings />
                    <TagSettings />
                </div>
            </div>
            <DataManagementSettings />
        </div>
    );
}
