
'use client';

import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { Category, UserProfile } from "@/lib/types";
import { collection, doc } from "firebase/firestore";
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import * as LucideIcons from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "../ui/separator";

const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="mr-2 h-4 w-4 text-muted-foreground" /> : <LucideIcons.Pilcrow className="mr-2 h-4 w-4 text-muted-foreground" />;
};

export function AnalysisSettingsContent() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const categoriesQuery = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/categories`) : null
    , [firestore, user]);
    
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);

    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const isLoading = categoriesLoading || profileLoading;

    const handleSettingChange = (key: keyof NonNullable<UserProfile['analysisSettings']>, value: any) => {
        if (!userProfileRef) return;
    
        const newSettings = {
            ...userProfile?.analysisSettings,
            [key]: value,
        };
    
        setDocumentNonBlocking(userProfileRef, {
            analysisSettings: newSettings
        }, { merge: true });
        
        toast({ title: 'Analysis settings updated.' });
    };

    const handleCategoryToggle = (categoryId: string) => {
        if (!userProfile) return;

        const currentExcluded = userProfile.analysisSettings?.excludedCategoryIds || [];
        const newExcluded = currentExcluded.includes(categoryId)
            ? currentExcluded.filter(id => id !== categoryId)
            : [...currentExcluded, categoryId];
        
        handleSettingChange('excludedCategoryIds', newExcluded);
    };
    
    const sortedCategories = categories ? [...categories].sort((a, b) => a.name.localeCompare(b.name)) : [];
    
    const analysisSettings = userProfile?.analysisSettings;

    const chartVisibilitySettings = [
        { key: 'showCategoryTable', label: 'Spending by Category Table' },
        { key: 'showTrendChart', label: 'Income vs. Expense Trend Chart' },
        { key: 'showCategoryBarChart', label: 'Top Spending Categories Chart' },
        { key: 'showTagPieChart', label: 'Spending by Tag Chart' },
        { key: 'showIncomePieChart', label: 'Income Sources Chart' },
        { key: 'showAiInsights', label: 'AI-Powered Insights' },
    ];


    return (
        <div className="space-y-4">
             {isLoading ? (
                <div className="flex justify-center"><Loader2 className="animate-spin" /></div>
            ) : (
                <>
                    <h4 className="font-semibold">Summary Cards</h4>
                     <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label>Show Normal Total</Label>
                            <p className="text-[0.8rem] text-muted-foreground">
                                Display the main summary for all transactions.
                            </p>
                        </div>
                        <Switch
                            checked={analysisSettings?.showNormalTotal ?? true}
                            onCheckedChange={(value) => handleSettingChange('showNormalTotal', value)}
                        />
                    </div>
                     <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label>Show Adjusted Total</Label>
                            <p className="text-[0.8rem] text-muted-foreground">
                                Display the summary card for adjusted analysis totals.
                            </p>
                        </div>
                        <Switch
                            checked={analysisSettings?.showAdjustedTotal ?? true}
                            onCheckedChange={(value) => handleSettingChange('showAdjustedTotal', value)}
                        />
                    </div>
                    
                    <Separator />
                    
                    <h4 className="font-semibold">Chart Visibility</h4>
                    <div className="space-y-2">
                        {chartVisibilitySettings.map(({ key, label }) => (
                            <div key={key} className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                <Label htmlFor={`vis-${key}`}>{label}</Label>
                                <Switch
                                    id={`vis-${key}`}
                                    checked={(analysisSettings?.[key as keyof typeof analysisSettings] as boolean) ?? true}
                                    onCheckedChange={(value) => handleSettingChange(key as keyof typeof analysisSettings, value)}
                                />
                            </div>
                        ))}
                    </div>

                    <Separator />

                    <h4 className="font-semibold">Excluded Categories</h4>
                    <p className="text-sm text-muted-foreground">Select categories to exclude from charts and AI insights.</p>
                    <Card>
                        <CardContent className="p-0">
                            <ScrollArea className="h-64 w-full">
                                <div className="p-4 space-y-2">
                                    {sortedCategories.map((category) => (
                                        <div key={category.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`exclude-${category.id}`}
                                                checked={analysisSettings?.excludedCategoryIds?.includes(category.id) ?? false}
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
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
