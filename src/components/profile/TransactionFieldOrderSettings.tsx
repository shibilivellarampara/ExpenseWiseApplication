'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { useState, useEffect } from "react";
import { ChevronDown, GripVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

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

    const [fields, setFields] = useState<FieldKey[]>(['description', 'accountId', 'categoryId', 'tagIds']);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (userProfile?.transactionFieldOrder) {
            setFields(userProfile.transactionFieldOrder);
        } else {
            // Default order
            setFields(['description', 'accountId', 'categoryId', 'tagIds']);
        }
    }, [userProfile]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.dataTransfer.setData("fieldIndex", index.toString());
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        const dragIndex = parseInt(e.dataTransfer.getData("fieldIndex"), 10);
        const newFields = [...fields];
        const [draggedItem] = newFields.splice(dragIndex, 1);
        newFields.splice(dropIndex, 0, draggedItem);
        setFields(newFields);
    };

    const handleSaveChanges = () => {
        if (!userProfileRef) return;
        setIsSaving(true);
        setDocumentNonBlocking(userProfileRef, { transactionFieldOrder: fields }, { merge: true })
            .then(() => {
                toast({ title: "Order Saved", description: "Your transaction form layout has been updated." });
            })
            .catch((error) => {
                toast({ variant: 'destructive', title: "Error Saving Order", description: error.message });
            })
            .finally(() => {
                setIsSaving(false);
            });
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
                            <h3 className="text-base font-semibold font-headline">Form Field Order</h3>
                            <CardDescription className="text-sm">Arrange transaction fields to your liking.</CardDescription>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="p-4 pt-0 space-y-4">
                        <p className="text-sm text-muted-foreground">Drag and drop to reorder the fields in the 'Add Transaction' form.</p>
                         <div className="space-y-2">
                            {fields.map((field, index) => (
                                <div
                                    key={field}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDrop(e, index)}
                                    className="flex items-center gap-2 p-3 rounded-md border bg-background cursor-grab active:cursor-grabbing"
                                >
                                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                                    <span>{fieldLabels[field]}</span>
                                </div>
                            ))}
                        </div>
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Order
                        </Button>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
