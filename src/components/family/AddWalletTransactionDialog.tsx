
'use client';

import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input, InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFirestore, useUser, addDocumentNonBlocking } from "@/firebase";
import { collection, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Category } from "@/lib/types";
import { Loader2, Pilcrow, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateTimePicker } from "@/components/DateTimePicker";
import * as LucideIcons from 'lucide-react';
import React from 'react';

const schema = z.object({
    description: z.string().min(1, "Required"),
    amount: z.coerce.number().positive("Must be positive"),
    type: z.enum(['expense', 'income']),
    categoryId: z.string().min(1, "Category is required"),
    date: z.date(),
});

type FormData = z.infer<typeof schema>;

const FloatingLabelInput = React.forwardRef<HTMLInputElement, InputProps & { label: string }>(
    ({ className, label, id, ...props }, ref) => {
        const hasValue = props.value !== undefined && props.value !== null && String(props.value) !== '';
        return (
            <div className="relative">
                <Input
                    ref={ref}
                    id={id}
                    placeholder=" "
                    className={cn("peer h-14 pt-5 text-base floating-input", className)}
                    data-has-value={hasValue}
                    {...props}
                />
                <Label
                    htmlFor={id}
                    className={cn(
                        "absolute left-3 text-muted-foreground transition-all bg-background px-1 pointer-events-none",
                         "top-1/2 -translate-y-1/2 text-base peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:font-medium",
                         "peer-data-[has-value=true]:top-0 peer-data-[has-value=true]:-translate-y-1/2 peer-data-[has-value=true]:text-xs peer-data-[has-value=true]:font-medium"
                    )}
                >
                    {label}
                </Label>
            </div>
        );
    }
);
FloatingLabelInput.displayName = 'FloatingLabelInput';

export function AddWalletTransactionDialog({ children, walletId, categories }: { children: React.ReactNode, walletId: string, categories: Category[] }) {
    const [open, setOpen] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            description: '',
            amount: '' as any,
            type: 'expense',
            categoryId: '',
            date: new Date(),
        }
    });

    const onSubmit = async (values: FormData) => {
        if (!user) return;
        setIsSaving(true);

        try {
            const txCol = collection(firestore, `familyWallets/${walletId}/transactions`);
            await addDocumentNonBlocking(txCol, {
                ...values,
                authorId: user.uid,
                authorName: user.displayName || "Unknown",
                origin: 'manual',
                createdAt: serverTimestamp(),
            });
            
            toast({ title: "Transaction Added" });
            setOpen(false);
            form.reset();
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed to save" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleQuickAddCategory = async () => {
        const name = prompt("Enter category name:");
        if (!name) return;
        const icon = prompt("Enter icon name (e.g. Utensils):", "Shapes") || "Shapes";
        
        try {
            const catRef = doc(collection(firestore, `familyWallets/${walletId}/categories`));
            await setDoc(catRef, { id: catRef.id, name, icon });
            toast({ title: "Category Created" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed to create category" });
        }
    };

    const renderIcon = (iconName: string | undefined) => {
        const IconComponent = (LucideIcons as any)[iconName || 'Pilcrow'];
        return IconComponent ? <IconComponent className="mr-2 h-4 w-4" /> : <Pilcrow className="mr-2 h-4 w-4" />;
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[24px]">
                <DialogHeader>
                    <DialogTitle className="font-headline">Add Family Transaction</DialogTitle>
                    <DialogDescription>This entry will be shared with all wallet members.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                                            <FormItem>
                                                <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-sm cursor-pointer transition-all", field.value === 'expense' ? "border-destructive text-destructive bg-destructive/5" : "border-muted")}>
                                                    <RadioGroupItem value="expense" className="sr-only" />
                                                    <span>Cash Out</span>
                                                </Label>
                                            </FormItem>
                                            <FormItem>
                                                <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-sm cursor-pointer transition-all", field.value === 'income' ? "border-primary text-primary bg-primary/5" : "border-muted")}>
                                                    <RadioGroupItem value="income" className="sr-only" />
                                                    <span>Cash In</span>
                                                </Label>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <Label className="text-xs text-muted-foreground px-1">Transaction Date</Label>
                                    <DateTimePicker field={field} />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FloatingLabelInput label="Amount *" id="amount" type="number" step="0.01" {...field} value={field.value ?? ''} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FloatingLabelInput label="Description *" id="desc" {...field} value={field.value ?? ''} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-14 rounded-xl text-base">
                                                <SelectValue placeholder="Select Category *" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <Button variant="ghost" className="w-full justify-start text-primary h-10 px-2" onClick={handleQuickAddCategory}>
                                                <PlusCircle className="h-4 w-4 mr-2" />
                                                Create new category
                                            </Button>
                                            {categories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    <div className="flex items-center">
                                                        {renderIcon(cat.icon)}
                                                        {cat.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4 gap-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
                            <Button type="submit" disabled={isSaving} className="flex-1">
                                {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : "Save Entry"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
