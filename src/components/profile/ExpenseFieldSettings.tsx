
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

export function ExpenseFieldSettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [user, firestore]);

    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const handleSettingChange = (key: keyof NonNullable<UserProfile['expenseFieldSettings']>, value: boolean) => {
        if (!userProfileRef) return;
        
        const settingsData = {
            expenseFieldSettings: {
                ...userProfile?.expenseFieldSettings,
                [key]: value,
            }
        };

        setDocumentNonBlocking(userProfileRef, settingsData, { merge: true });

        toast({ title: "Settings Updated" });
    }

    const isDescriptionRequired = userProfile?.expenseFieldSettings?.isDescriptionRequired ?? false;
    const isTagRequired = userProfile?.expenseFieldSettings?.isTagRequired ?? false;
    const isCategoryRequired = userProfile?.expenseFieldSettings?.isCategoryRequired ?? true;

    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
                        <div>
                            <h3 className="text-lg font-semibold font-headline">Expense Fields</h3>
                            <CardDescription>Customize which fields are required.</CardDescription>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
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
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
