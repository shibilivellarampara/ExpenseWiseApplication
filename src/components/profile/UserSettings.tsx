'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { UserProfile } from "@/lib/types";
import { Separator } from "../ui/separator";
import { CategorySettings } from "./CategorySettings";
import { PaymentMethodSettings } from "./PaymentMethodSettings";
import { TagSettings } from "./TagSettings";

const currencySchema = z.object({
  defaultCurrency: z.string().min(3, "Must be a 3-letter code").max(3, "Must be a 3-letter code"),
});

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

    const form = useForm<z.infer<typeof currencySchema>>({
        resolver: zodResolver(currencySchema),
    });

    useEffect(() => {
        if (userProfile) {
            form.setValue('defaultCurrency', userProfile.defaultCurrency || 'USD');
        }
    }, [userProfile, form]);
    
    const onSubmit = async (values: z.infer<typeof currencySchema>) => {
        if (!userProfileRef) return;
        setIsSaving(true);
        try {
            await setDoc(userProfileRef, {
                defaultCurrency: values.defaultCurrency,
            }, { merge: true });
            toast({ title: "Preferences Saved", description: "Your currency preference has been updated." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

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
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardHeader>
                            <CardTitle className="font-headline">Currency</CardTitle>
                            <CardDescription>Set your default currency for expenses.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="defaultCurrency"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Default Currency</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a currency" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter className="border-t pt-6">
                            <Button type="submit" disabled={isSaving} className="w-full md:w-auto">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Currency
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>

            <CategorySettings />
            <PaymentMethodSettings />
            <TagSettings />
        </div>
    );
}
