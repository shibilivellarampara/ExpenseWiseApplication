
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

    const show5YearView = userProfile?.dashboardSettings?.show5YearView ?? false;
    const transactionGrouping = userProfile?.dashboardSettings?.transactionGrouping || 'daily';

    return (
        <div className="space-y-4">
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
             <div className="rounded-lg border p-3 shadow-sm space-y-2">
                <Label>Default Transaction View</Label>
                 <RadioGroup
                    value={transactionGrouping}
                    onValueChange={(value) => handleSettingChange('transactionGrouping', value)}
                    className="flex space-x-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="daily" id="daily-view" />
                        <Label htmlFor="daily-view" className="font-normal">Group by Day</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monthly" id="monthly-view" />
                        <Label htmlFor="monthly-view" className="font-normal">Group by Month</Label>
                    </div>
                </RadioGroup>
                <p className="text-[0.8rem] text-muted-foreground">
                    How to group transactions on the main page.
                </p>
            </div>
        </div>
    );
}
