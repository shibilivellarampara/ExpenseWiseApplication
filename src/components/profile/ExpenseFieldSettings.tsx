'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function ExpenseFieldSettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [user, firestore]);

    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const handleSettingChange = async (key: keyof NonNullable<UserProfile['expenseFieldSettings']>, value: boolean) => {
        if (!userProfileRef) return;

        try {
            await setDoc(userProfileRef, {
                expenseFieldSettings: {
                    ...userProfile?.expenseFieldSettings,
                    [key]: value,
                }
            }, { merge: true });
            toast({ title: "Settings Updated" });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: "Could not save your setting." });
        }
    }

    const isDescriptionRequired = userProfile?.expenseFieldSettings?.isDescriptionRequired ?? false;
    const isTagRequired = userProfile?.expenseFieldSettings?.isTagRequired ?? false;
    const isCategoryRequired = userProfile?.expenseFieldSettings?.isCategoryRequired ?? true;
    const isPaymentMethodRequired = userProfile?.expenseFieldSettings?.isPaymentMethodRequired ?? true;


    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Expense Fields</CardTitle>
                <CardDescription>Customize which fields are required when adding an expense.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <Label>Require Category</Label>
                         <p className="text-[0.8rem] text-muted-foreground">
                            Make the category field mandatory.
                        </p>
                    </div>
                    <Switch
                        checked={isCategoryRequired}
                        onCheckedChange={(value) => handleSettingChange('isCategoryRequired', value)}
                    />
                </div>
                 <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <Label>Require Payment Method</Label>
                         <p className="text-[0.8rem] text-muted-foreground">
                            Make the payment method field mandatory.
                        </p>
                    </div>
                    <Switch
                        checked={isPaymentMethodRequired}
                        onCheckedChange={(value) => handleSettingChange('isPaymentMethodRequired', value)}
                    />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <Label>Require Description</Label>
                        <p className="text-[0.8rem] text-muted-foreground">
                            Make the description field mandatory.
                        </p>
                    </div>
                    <Switch
                        checked={isDescriptionRequired}
                        onCheckedChange={(value) => handleSettingChange('isDescriptionRequired', value)}
                    />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <Label>Require Tag</Label>
                         <p className="text-[0.8rem] text-muted-foreground">
                            Make the tag/label field mandatory.
                        </p>
                    </div>
                    <Switch
                        checked={isTagRequired}
                        onCheckedChange={(value) => handleSettingChange('isTagRequired', value)}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
