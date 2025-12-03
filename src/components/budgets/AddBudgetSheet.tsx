
'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '../ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useFirestore, useUser, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Category, Budget } from '@/lib/types';
import { format } from 'date-fns';

const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Please select a category.'),
  amount: z.coerce.number().positive('Budget amount must be a positive number.'),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

interface AddBudgetSheetProps {
    children: React.ReactNode;
    allCategories: Category[];
    existingBudgets: Budget[];
    budgetToEdit?: Budget;
}

export function AddBudgetSheet({ children, allCategories, existingBudgets, budgetToEdit }: AddBudgetSheetProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const isEditMode = !!budgetToEdit;

    const availableCategories = useMemo(() => {
        if (isEditMode) return allCategories;
        const budgetedCategoryIds = new Set(existingBudgets.map(b => b.categoryId));
        return allCategories.filter(c => !budgetedCategoryIds.has(c.id));
    }, [allCategories, existingBudgets, isEditMode]);
    

    const form = useForm<BudgetFormData>({
        resolver: zodResolver(budgetSchema),
        defaultValues: {
            categoryId: '',
            amount: undefined,
        },
    });

    useEffect(() => {
        if (open) {
            if (isEditMode && budgetToEdit) {
                form.reset({
                    categoryId: budgetToEdit.categoryId,
                    amount: budgetToEdit.amount,
                });
            } else {
                form.reset({
                    categoryId: '',
                    amount: undefined,
                });
            }
        }
    }, [open, form, isEditMode, budgetToEdit]);


    async function onSubmit(values: BudgetFormData) {
        setIsLoading(true);
        if (!firestore || !user) {
             toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
             setIsLoading(false);
             return;
        }

        const currentMonth = format(new Date(), 'yyyy-MM');
        const budgetData = {
            ...values,
            userId: user.uid,
            month: currentMonth,
        };

        try {
            if (isEditMode && budgetToEdit) {
                const budgetRef = doc(firestore, `users/${user.uid}/budgets`, budgetToEdit.id);
                setDocumentNonBlocking(budgetRef, budgetData, { merge: true });
                toast({ title: 'Budget Updated!' });
            } else {
                const budgetCol = collection(firestore, `users/${user.uid}/budgets`);
                addDocumentNonBlocking(budgetCol, budgetData);
                toast({ title: 'Budget Set!' });
            }
            setOpen(false);

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{children}</SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle className="font-headline">{isEditMode ? 'Edit Budget' : 'Set a New Budget'}</SheetTitle>
                    <SheetDescription>
                        {isEditMode ? 'Update the amount for this category.' : 'Set a spending limit for a category for this month.'}
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
                        <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditMode}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {availableCategories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                         {availableCategories.length === 0 && !isEditMode && (
                                            <div className="p-4 text-sm text-muted-foreground text-center">All categories have a budget for this month.</div>
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Budget Amount</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" placeholder="e.g., 5000" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditMode ? "Save Changes" : "Set Budget"}
                        </Button>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}
