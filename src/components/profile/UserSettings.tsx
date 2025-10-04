'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { UserProfile } from "@/lib/types";
import { CategorySettings } from "./CategorySettings";
import { PaymentMethodSettings } from "./PaymentMethodSettings";
import { TagSettings } from "./TagSettings";
import { ExpenseFieldSettings } from "./ExpenseFieldSettings";

const currencies = ["USD", "EUR", "JPY", "GBP", "INR"];

export function UserSettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [user, firestore]);

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState(userProfile?.defaultCurrency || 'USD');

    // Effect to update local state when user profile loads
    useEffect(() => {
        if (userProfile?.defaultCurrency) {
            setSelectedCurrency(userProfile.defaultCurrency);
        }
    }, [userProfile]);
    
    const handleCurrencyChange = async (newCurrency: string) => {
        if (!userProfileRef || newCurrency === selectedCurrency) {
            return;
        }
        setIsSaving(true);
        setSelectedCurrency(newCurrency);
        try {
            await setDoc(userProfileRef, {
                defaultCurrency: newCurrency,
            }, { merge: true });
            toast({ title: "Currency Saved", description: `Your default currency is now ${newCurrency}.` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
            // Revert on failure
            setSelectedCurrency(userProfile?.defaultCurrency || 'USD');
        } finally {
            setIsSaving(false);
        }
    }


    if (isProfileLoading) {
        return (
            <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Preferences</CardTitle>
                  <CardDescription>Manage your app settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex items-center justify-center py-10">
                    <Loader2 className="mx-auto animate-spin" />
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Currency</CardTitle>
                    <CardDescription>Set your default currency for expenses.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Default Currency
                        </label>
                        <div className="relative">
                             <Select onValueChange={handleCurrencyChange} value={selectedCurrency} disabled={isSaving}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {isSaving && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <ExpenseFieldSettings />
            <CategorySettings />
            <PaymentMethodSettings />
            <TagSettings />
        </div>
    );
}
