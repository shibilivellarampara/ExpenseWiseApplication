
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardSettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [user, firestore]);

    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const handleSettingChange = (key: keyof NonNullable<UserProfile['dashboardSettings']>, value: boolean | string) => {
        if (!userProfileRef) return;
        
        const settingsData = {
            dashboardSettings: {
                ...userProfile?.dashboardSettings,
                [key]: value,
            }
        };

        setDocumentNonBlocking(userProfileRef, settingsData, { merge: true });

        toast({ title: "Settings Updated" });
    }

    const useCategoryColors = userProfile?.dashboardSettings?.useCategoryColorsInChart ?? true;
    const show5YearView = userProfile?.dashboardSettings?.show5YearView ?? false;
    const isAiSuggestionEnabled = userProfile?.dashboardSettings?.isAiSuggestionEnabled ?? true;
    const transactionViewMode = userProfile?.dashboardSettings?.transactionViewMode || 'normal';


    return (
        <Card>
             <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="flex flex-row items-center justify-between cursor-pointer p-4">
                        <div>
                            <h3 className="text-base font-semibold font-headline">Dashboard &amp; AI</h3>
                            <CardDescription className="text-sm">Customize your dashboard and AI features.</CardDescription>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="p-4 pt-0 space-y-4">
                         <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <Label>Compact Transaction View</Label>
                                <p className="text-[0.8rem] text-muted-foreground">
                                    Display more transactions on the screen.
                                </p>
                            </div>
                            <Switch
                                checked={transactionViewMode === 'compact'}
                                onCheckedChange={(value) => handleSettingChange('transactionViewMode', value ? 'compact' : 'normal')}
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <Label>Enable AI Suggestions</Label>
                                <p className="text-[0.8rem] text-muted-foreground">
                                    Get automatic suggestions as you type.
                                </p>
                            </div>
                            <Switch
                                checked={isAiSuggestionEnabled}
                                onCheckedChange={(value) => handleSettingChange('isAiSuggestionEnabled', value)}
                            />
                        </div>
                         <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <Label>Use Category Colors</Label>
                                <p className="text-[0.8rem] text-muted-foreground">
                                    Color-code the expense chart by category.
                                </p>
                            </div>
                            <Switch
                                checked={useCategoryColors}
                                onCheckedChange={(value) => handleSettingChange('useCategoryColorsInChart', value)}
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <Label>Show 5-Year View</Label>
                                <p className="text-[0.8rem] text-muted-foreground">
                                    Show a "5 Years" tab in the expense overview chart.
                                </p>
                            </div>
                            <Switch
                                checked={show5YearView}
                                onCheckedChange={(value) => handleSettingChange('show5YearView', value)}
                            />
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
