
'use client';

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Loader2 } from "lucide-react";

export function DashboardSettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [user, firestore]);

    const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="animate-spin" />
            </div>
        );
    }


    const useCategoryColors = userProfile?.dashboardSettings?.useCategoryColorsInChart ?? true;
    const show5YearView = userProfile?.dashboardSettings?.show5YearView ?? false;
    const isAiSuggestionEnabled = userProfile?.dashboardSettings?.isAiSuggestionEnabled ?? true;
    const transactionViewMode = userProfile?.dashboardSettings?.transactionViewMode || 'normal';
    const transactionGrouping = userProfile?.dashboardSettings?.transactionGrouping || 'daily';


    return (
        <div className="space-y-4">
            <div className="rounded-lg border p-3 shadow-sm space-y-2">
                 <Label>Transaction View</Label>
                  <RadioGroup
                    value={transactionGrouping}
                    onValueChange={(value) => handleSettingChange('transactionGrouping', value)}
                    className="flex space-x-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="daily" id="daily-view" />
                        <Label htmlFor="daily-view" className="font-normal">Daily</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monthly" id="monthly-view" />
                        <Label htmlFor="monthly-view" className="font-normal">Monthly</Label>
                    </div>
                </RadioGroup>
                 <p className="text-[0.8rem] text-muted-foreground">
                    Group transactions on the main page by day or by month.
                </p>
            </div>
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
        </div>
    );
}
