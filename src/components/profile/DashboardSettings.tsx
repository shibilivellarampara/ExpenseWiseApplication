
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function DashboardSettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [user, firestore]);

    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const handleSettingChange = (key: keyof NonNullable<UserProfile['dashboardSettings']>, value: boolean) => {
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

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Dashboard</CardTitle>
                <CardDescription>Customize the appearance of your dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
        </Card>
    );
}
