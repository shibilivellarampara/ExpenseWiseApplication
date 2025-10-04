'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from "@/firebase";
import { doc, setDoc, writeBatch, collection, query, where, getDocs } from "firebase/firestore";
import { Loader2, PlusCircle, Trash2, Edit, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Expense, UserProfile } from "@/lib/types";
import { Separator } from "../ui/separator";

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

    const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
    const [newPaymentMethod, setNewPaymentMethod] = useState("");
    const [editingMethod, setEditingMethod] = useState<{ old: string; new: string } | null>(null);
    
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [editingTag, setEditingTag] = useState<{ old: string; new: string } | null>(null);


    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<z.infer<typeof currencySchema>>({
        resolver: zodResolver(currencySchema),
    });

    useEffect(() => {
        if (userProfile) {
            form.setValue('defaultCurrency', userProfile.defaultCurrency || 'USD');
            setPaymentMethods(userProfile.paymentMethods || ['Cash', 'Credit Card']);
            setTags(userProfile.tags || []);
        }
    }, [userProfile, form]);
    
    const handleAddPaymentMethod = () => {
        if (newPaymentMethod && !paymentMethods.includes(newPaymentMethod)) {
            setPaymentMethods([...paymentMethods, newPaymentMethod]);
            setNewPaymentMethod("");
        }
    };
    
    const handleRemovePaymentMethod = (methodToRemove: string) => {
        setPaymentMethods(paymentMethods.filter(method => method !== methodToRemove));
    };

    const handleAddTag = () => {
        if (newTag && !tags.includes(newTag)) {
            setTags([...tags, newTag]);
            setNewTag("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleSaveEditedMethod = async () => {
        if (!editingMethod || !user || !firestore) return;

        const { old: oldMethod, new: newMethod } = editingMethod;

        if (!newMethod || newMethod === oldMethod) {
            setEditingMethod(null);
            return;
        }

        setIsSaving(true);
        try {
            // Update expenses
            const expensesRef = collection(firestore, `users/${user.uid}/expenses`);
            const q = query(expensesRef, where("paymentMethod", "==", oldMethod));
            const querySnapshot = await getDocs(q);

            const batch = writeBatch(firestore);
            querySnapshot.forEach((doc) => {
                batch.update(doc.ref, { paymentMethod: newMethod });
            });

            // Update user profile
            const updatedMethods = paymentMethods.map(p => p === oldMethod ? newMethod : p);
            batch.update(userProfileRef, { paymentMethods: updatedMethods });

            await batch.commit();

            setPaymentMethods(updatedMethods);
            toast({ title: "Payment Method Updated", description: "Your settings and expenses have been updated." });

        } catch (error: any) {
            toast({ variant: "destructive", title: "Update Failed", description: error.message });
        } finally {
            setEditingMethod(null);
            setIsSaving(false);
        }
    };

    const handleSaveEditedTag = async () => {
        if (!editingTag || !user || !firestore) return;
        const { old: oldTag, new: newTag } = editingTag;

        if (!newTag || newTag === oldTag) {
            setEditingTag(null);
            return;
        }

        setIsSaving(true);
        try {
            // Update expenses
            const expensesRef = collection(firestore, `users/${user.uid}/expenses`);
            const q = query(expensesRef, where("tag", "==", oldTag));
            const querySnapshot = await getDocs(q);
            
            const batch = writeBatch(firestore);
            querySnapshot.forEach((doc) => {
                batch.update(doc.ref, { tag: newTag });
            });

            // Update user profile
            const updatedTags = tags.map(t => t === oldTag ? newTag : t);
            batch.update(userProfileRef, { tags: updatedTags });

            await batch.commit();

            setTags(updatedTags);
            toast({ title: "Tag Updated", description: "Your settings and expenses have been updated." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Update Failed", description: error.message });
        } finally {
            setEditingTag(null);
            setIsSaving(false);
        }
    };

    const onSubmit = async (values: z.infer<typeof currencySchema>) => {
        if (!userProfileRef) return;
        setIsSaving(true);
        try {
            await setDoc(userProfileRef, {
                defaultCurrency: values.defaultCurrency,
                paymentMethods: paymentMethods,
                tags: tags,
            }, { merge: true });
            toast({ title: "Settings Saved", description: "Your preferences have been updated." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isProfileLoading) {
        return (
            <Card>
                <CardHeader><CardTitle>User Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <Loader2 className="mx-auto animate-spin" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle className="font-headline">Preferences</CardTitle>
                        <CardDescription>Manage your app settings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* Currency Settings */}
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

                        <Separator />

                        {/* Payment Methods */}
                        <div className="space-y-4">
                            <FormLabel>Payment Methods</FormLabel>
                            <div className="space-y-2">
                                {paymentMethods.map((method) => (
                                    <div key={method} className="flex items-center justify-between">
                                        {editingMethod?.old === method ? (
                                            <Input
                                                value={editingMethod.new}
                                                onChange={(e) => setEditingMethod({ ...editingMethod, new: e.target.value })}
                                                autoFocus
                                            />
                                        ) : (
                                            <span>{method}</span>
                                        )}
                                        <div className="flex items-center">
                                            {editingMethod?.old === method ? (
                                                <>
                                                    <Button variant="ghost" size="icon" type="button" onClick={handleSaveEditedMethod} disabled={isSaving}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" type="button" onClick={() => setEditingMethod(null)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button variant="ghost" size="icon" type="button" onClick={() => setEditingMethod({ old: method, new: method })}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" type="button" onClick={() => handleRemovePaymentMethod(method)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={newPaymentMethod}
                                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                                    placeholder="Add new payment method"
                                />
                                <Button type="button" size="icon" onClick={handleAddPaymentMethod}>
                                    <PlusCircle className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        {/* Tags */}
                        <div className="space-y-4">
                            <FormLabel>Expense Tags</FormLabel>
                             <div className="space-y-2">
                                {tags.map((tag) => (
                                     <div key={tag} className="flex items-center justify-between">
                                        {editingTag?.old === tag ? (
                                            <Input
                                                value={editingTag.new}
                                                onChange={(e) => setEditingTag({ ...editingTag, new: e.target.value })}
                                                autoFocus
                                            />
                                        ) : (
                                            <span>{tag}</span>
                                        )}
                                        <div className="flex items-center">
                                            {editingTag?.old === tag ? (
                                                <>
                                                    <Button variant="ghost" size="icon" type="button" onClick={handleSaveEditedTag} disabled={isSaving}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" type="button" onClick={() => setEditingTag(null)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button variant="ghost" size="icon" type="button" onClick={() => setEditingTag({ old: tag, new: tag })}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" type="button" onClick={() => handleRemoveTag(tag)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    placeholder="Add new tag"
                                />
                                <Button type="button" size="icon" onClick={handleAddTag}>
                                    <PlusCircle className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t pt-6">
                        <Button type="submit" disabled={isSaving} className="w-full">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Preferences
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}