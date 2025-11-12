
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { useState, useEffect } from "react";
import { ChevronDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

const fieldLabels: Record<string, string> = {
    description: 'Description',
    accountId: 'Account',
    categoryId: 'Category',
    tagIds: 'Tags'
};

type FieldKey = 'description' | 'accountId' | 'categoryId' | 'tagIds';

export function TransactionFieldOrderSettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(true);
    
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const [fields, setFields] = useState<FieldKey[]>(['description', 'accountId', 'categoryId', 'tagIds']);
    const [requiredFields, setRequiredFields] = useState({
        isDescriptionRequired: false,
        isTagRequired: false,
        isCategoryRequired: true,
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setFields(userProfile.transactionFieldOrder || ['description', 'accountId', 'categoryId', 'tagIds']);
            setRequiredFields({
                isDescriptionRequired: userProfile.expenseFieldSettings?.isDescriptionRequired ?? false,
                isTagRequired: userProfile.expenseFieldSettings?.isTagRequired ?? false,
                isCategoryRequired: userProfile.expenseFieldSettings?.isCategoryRequired ?? true,
            });
        }
    }, [userProfile]);

    const handleMoveField = (index: number, direction: 'up' | 'down') => {
        const newFields = [...fields];
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex >= 0 && newIndex < newFields.length) {
            const temp = newFields[index];
            newFields[index] = newFields[newIndex];
            newFields[newIndex] = temp;
            setFields(newFields);
        }
    };

    const handleRequiredChange = (key: keyof typeof requiredFields, value: boolean) => {
        setRequiredFields(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveChanges = () => {
        if (!userProfileRef) return;
        setIsSaving(true);
        
        const settingsData = {
            transactionFieldOrder: fields,
            expenseFieldSettings: requiredFields,
        };
        
        setDocumentNonBlocking(userProfileRef, settingsData, { merge: true })
            .then(() => {
                toast({ title: "Settings Saved", description: "Your form customization has been updated." });
            })
            .catch((error) => {
                toast({ variant: 'destructive', title: "Error Saving Settings", description: error.message });
            })
            .finally(() => {
                setIsSaving(false);
            });
    };

    if (isProfileLoading) {
        return <Card><CardHeader><CardTitle>Loading settings...</CardTitle></CardHeader></Card>;
    }

    const isChanged = JSON.stringify(fields) !== JSON.stringify(userProfile?.transactionFieldOrder || ['description', 'accountId', 'categoryId', 'tagIds']) ||
                        requiredFields.isCategoryRequired !== (userProfile?.expenseFieldSettings?.isCategoryRequired ?? true) ||
                        requiredFields.isDescriptionRequired !== (userProfile?.expenseFieldSettings?.isDescriptionRequired ?? false) ||
                        requiredFields.isTagRequired !== (userProfile?.expenseFieldSettings?.isTagRequired ?? false);


    return (
         <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen} defaultOpen={true}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="flex flex-row items-center justify-between cursor-pointer p-4">
                        <div>
                            <h3 className="text-base font-semibold font-headline">Form Customization</h3>
                            <CardDescription className="text-sm">Reorder fields and set which are required.</CardDescription>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="p-4 pt-0 space-y-4">
                         <div className="space-y-2">
                            {fields.map((field, index) => {
                                const isToggleable = field !== 'accountId'; // Account is always required
                                let requiredKey: keyof typeof requiredFields | null = null;
                                if (field === 'description') requiredKey = 'isDescriptionRequired';
                                if (field === 'categoryId') requiredKey = 'isCategoryRequired';
                                if (field === 'tagIds') requiredKey = 'isTagRequired';

                                return (
                                    <div
                                        key={field}
                                        className="flex items-center gap-2 p-2 rounded-md border bg-background"
                                    >
                                        <span className="flex-1 font-medium">{fieldLabels[field]}</span>
                                        
                                        {isToggleable && requiredKey && (
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor={`required-${field}`} className="text-xs text-muted-foreground">Required</Label>
                                                <Switch
                                                    id={`required-${field}`}
                                                    checked={requiredFields[requiredKey]}
                                                    onCheckedChange={(value) => handleRequiredChange(requiredKey!, value)}
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => handleMoveField(index, 'up')}
                                                disabled={index === 0}
                                            >
                                                <ArrowUp className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => handleMoveField(index, 'down')}
                                                disabled={index === fields.length - 1}
                                            >
                                                <ArrowDown className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        {isChanged && (
                             <Button onClick={handleSaveChanges} disabled={isSaving} size="sm">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
