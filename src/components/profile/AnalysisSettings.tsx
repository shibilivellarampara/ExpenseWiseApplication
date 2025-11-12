
'use client';

import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { Category, UserProfile } from "@/lib/types";
import { collection, doc } from "firebase/firestore";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Loader2, ChevronDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import * as LucideIcons from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from "@/lib/utils";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";

export function AnalysisSettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const categoriesQuery = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/categories`) : null
    , [firestore, user]);
    
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);

    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const isLoading = categoriesLoading || profileLoading;

    const handleCategoryToggle = (categoryId: string) => {
        if (!userProfileRef || !userProfile) return;

        const currentExcluded = userProfile.analysisSettings?.excludedCategoryIds || [];
        const newExcluded = currentExcluded.includes(categoryId)
            ? currentExcluded.filter(id => id !== categoryId)
            : [...currentExcluded, categoryId];

        setDocumentNonBlocking(userProfileRef, {
            analysisSettings: {
                excludedCategoryIds: newExcluded
            }
        }, { merge: true });
        
        toast({ title: 'Analysis settings updated.' });
    };
    
    const sortedCategories = categories ? [...categories].sort((a, b) => a.name.localeCompare(b.name)) : [];
    const excludedIds = userProfile?.analysisSettings?.excludedCategoryIds || [];

    const renderIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="mr-2 h-4 w-4 text-muted-foreground" /> : <LucideIcons.Pilcrow className="mr-2 h-4 w-4 text-muted-foreground" />;
    };

    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                     <CardHeader className="flex flex-row items-center justify-between cursor-pointer p-4">
                        <div>
                            <h3 className="text-base font-semibold font-headline">Analysis Settings</h3>
                            <CardDescription className="text-sm">Customize which categories to exclude.</CardDescription>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="space-y-4 pt-0 p-4">
                        <p className="text-sm text-muted-foreground">Select categories to exclude from the Analysis page.</p>
                        {isLoading ? (
                            <div className="flex justify-center"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <ScrollArea className="h-48 w-full rounded-md border">
                                <div className="p-4 space-y-2">
                                    {sortedCategories.map((category) => (
                                        <div key={category.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`exclude-${category.id}`}
                                                checked={excludedIds.includes(category.id)}
                                                onCheckedChange={() => handleCategoryToggle(category.id)}
                                            />
                                            <Label htmlFor={`exclude-${category.id}`} className="flex items-center font-normal">
                                                {renderIcon(category.icon)}
                                                {category.name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
