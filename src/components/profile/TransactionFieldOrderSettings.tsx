
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking, useCollection } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import { UserProfile, Account } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { useState, useEffect } from "react";
import { ChevronDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import * as LucideIcons from 'lucide-react';
import { useDebounce } from 'use-debounce';


const allPossibleFields: FieldKey[] = ['description', 'accountId', 'categoryId', 'tagIds'];

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
    const [isOpen, setIsOpen] = useState(false);
    
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const accountsQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/accounts`), where('status', '==', 'active')) : null, 
    [user, firestore]);
    const { data: accounts } = useCollection<Account>(accountsQuery);

    const [orderedFields, setOrderedFields] = useState<FieldKey[]>(allPossibleFields);
    const [visibleFields, setVisibleFields] = useState<FieldKey[]>(allPossibleFields);
    const [defaultAccountId, setDefaultAccountId] = useState<string | undefined>(undefined);

    const [requiredFields, setRequiredFields] = useState({
        isDescriptionRequired: false,
        isTagRequired: false,
        isCategoryRequired: true,
    });
    
    const [debouncedSettings] = useDebounce({ orderedFields, visibleFields, defaultAccountId, requiredFields }, 500);

    useEffect(() => {
        if (userProfile) {
            setOrderedFields(userProfile.transactionFieldOrder || allPossibleFields);
            setVisibleFields(userProfile.expenseFieldSettings?.visibleFields || allPossibleFields);
            setDefaultAccountId(userProfile.expenseFieldSettings?.defaultAccountId);
            setRequiredFields({
                isDescriptionRequired: userProfile.expenseFieldSettings?.isDescriptionRequired ?? false,
                isTagRequired: userProfile.expenseFieldSettings?.isTagRequired ?? false,
                isCategoryRequired: userProfile.expenseFieldSettings?.isCategoryRequired ?? true,
            });
        }
    }, [userProfile]);
    
    const handleSave = (newSettings: Partial<typeof debouncedSettings>) => {
        if (!userProfileRef) return;
        
        const settingsData: any = {
            transactionFieldOrder: newSettings.orderedFields,
            expenseFieldSettings: {
                ...userProfile?.expenseFieldSettings,
                ...newSettings.requiredFields,
                visibleFields: newSettings.visibleFields,
            },
        };

        if (newSettings.defaultAccountId) {
            settingsData.expenseFieldSettings.defaultAccountId = newSettings.defaultAccountId;
        } else {
             // To remove the field from Firestore, we need to handle it specially
             // For now, we'll just not include it if it's undefined.
             // A better solution would use `deleteField()` from Firestore, but this works for now.
             if (settingsData.expenseFieldSettings.hasOwnProperty('defaultAccountId')) {
                 delete settingsData.expenseFieldSettings.defaultAccountId;
             }
        }
        
        setDocumentNonBlocking(userProfileRef, settingsData, { merge: true })
            .then(() => {
                toast({ title: "Settings Saved", description: "Your form customization has been updated." });
            })
            .catch((error) => {
                toast({ variant: 'destructive', title: "Error Saving Settings", description: error.message });
            });
    }

    useEffect(() => {
        // Don't save on initial load
        if (isProfileLoading) return;
        
        const initialSettings = {
            orderedFields: userProfile?.transactionFieldOrder || allPossibleFields,
            visibleFields: userProfile?.expenseFieldSettings?.visibleFields || allPossibleFields,
            defaultAccountId: userProfile?.expenseFieldSettings?.defaultAccountId,
            requiredFields: {
                isDescriptionRequired: userProfile?.expenseFieldSettings?.isDescriptionRequired ?? false,
                isTagRequired: userProfile?.expenseFieldSettings?.isTagRequired ?? false,
                isCategoryRequired: userProfile?.expenseFieldSettings?.isCategoryRequired ?? true,
            }
        };

        if (JSON.stringify(debouncedSettings) !== JSON.stringify(initialSettings)) {
            handleSave(debouncedSettings);
        }

    }, [debouncedSettings, userProfile, isProfileLoading]);


    const handleMoveField = (index: number, direction: 'up' | 'down') => {
        const newFields = [...orderedFields];
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex >= 0 && newIndex < newFields.length) {
            const temp = newFields[index];
            newFields[index] = newFields[newIndex];
            newFields[newIndex] = temp;
            setOrderedFields(newFields);
        }
    };

    const handleRequiredChange = (key: keyof typeof requiredFields, value: boolean) => {
        setRequiredFields(prev => ({ ...prev, [key]: value }));
    };

    const handleVisibilityChange = (field: FieldKey, isVisible: boolean) => {
        if (isVisible) {
            setVisibleFields(prev => [...prev, field]);
        } else {
            setVisibleFields(prev => prev.filter(f => f !== field));
        }
    };
    
    const renderIcon = (iconName: string | undefined, className?: string) => {
        if (!iconName) return <LucideIcons.Pilcrow className={cn("mr-2 h-4 w-4", className)} />;
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className={cn("mr-2 h-4 w-4", className)} /> : <LucideIcons.Pilcrow className={cn("mr-2 h-4 w-4", className)} />;
    };

    if (isProfileLoading) {
        return <Card><CardHeader><CardTitle>Loading settings...</CardTitle></CardHeader></Card>;
    }


    return (
         <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="flex flex-row items-center justify-between cursor-pointer p-4">
                        <div>
                            <h3 className="text-base font-semibold font-headline">Form Customization</h3>
                            <CardDescription className="text-sm">Customize transaction form fields.</CardDescription>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="p-4 pt-0 space-y-4">
                         <div className="space-y-2">
                             <Label>Field Visibility & Order</Label>
                            {orderedFields.map((field, index) => {
                                const isToggleable = field !== 'accountId';
                                let requiredKey: keyof typeof requiredFields | null = null;
                                if (field === 'description') requiredKey = 'isDescriptionRequired';
                                if (field === 'categoryId') requiredKey = 'isCategoryRequired';
                                if (field === 'tagIds') requiredKey = 'isTagRequired';

                                return (
                                    <div
                                        key={field}
                                        className="flex items-center gap-2 p-2 rounded-md border bg-background flex-wrap"
                                    >
                                        <span className="flex-1 font-medium min-w-[80px]">{fieldLabels[field]}</span>
                                        
                                        {field === 'accountId' ? (
                                             <div className="flex-1 min-w-[150px]">
                                                <Select value={defaultAccountId || 'none'} onValueChange={(value) => setDefaultAccountId(value === 'none' ? undefined : value)}>
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Set default..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">No Default</SelectItem>
                                                        {accounts?.map(account => (
                                                            <SelectItem key={account.id} value={account.id}>
                                                                <div className="flex items-center gap-2">
                                                                    {renderIcon(account.icon)}
                                                                    {account.name}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ) : (
                                            <>
                                                {isToggleable && (
                                                    <div className="flex items-center gap-1">
                                                        <Switch
                                                            id={`visible-${field}`}
                                                            checked={visibleFields.includes(field)}
                                                            onCheckedChange={(checked) => handleVisibilityChange(field, checked)}
                                                        />
                                                        <Label htmlFor={`visible-${field}`} className="text-xs text-muted-foreground">Show</Label>
                                                    </div>
                                                )}
                                                
                                                {requiredKey && (
                                                    <div className="flex items-center gap-1">
                                                        <Switch
                                                            id={`required-${field}`}
                                                            checked={requiredFields[requiredKey]}
                                                            onCheckedChange={(value) => handleRequiredChange(requiredKey!, value)}
                                                        />
                                                        <Label htmlFor={`required-${field}`} className="text-xs text-muted-foreground">Required</Label>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <div className="flex items-center gap-1 ml-auto">
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
                                                disabled={index === orderedFields.length - 1}
                                            >
                                                <ArrowDown className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
