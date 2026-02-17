'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input, InputProps } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RecurringExpense, Category, Account } from '@/lib/types';
import { DateTimePicker } from '@/components/DateTimePicker';
import React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { renderIcon } from '@/lib/render-icon';

const recurringSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  amount: z.coerce.number().positive('Amount must be positive.'),
  type: z.enum(['expense', 'income']),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  startDate: z.date({ required_error: 'Start date is required.' }),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  description: z.string().optional(),
});

type RecurringFormData = z.infer<typeof recurringSchema>;

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

const FloatingLabelSelect = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof SelectTrigger> & { label: string; children: React.ReactNode; onValueChange: (value: string) => void; value?: string }>(
    ({ className, label, id, children, onValueChange, value, ...props }, ref) => {
        const hasValue = !!value;
        return (
            <div className="relative">
                 <Select onValueChange={onValueChange} value={value}>
                    <SelectTrigger ref={ref} id={id} className={cn("peer h-14 pt-4 text-base floating-input", className)} data-has-value={hasValue} {...props}>
                        <SelectValue placeholder=" "/>
                    </SelectTrigger>
                    <SelectContent>
                        {children}
                    </SelectContent>
                </Select>
                 <Label
                    htmlFor={id}
                     className={cn(
                        "absolute left-3 text-muted-foreground transition-all bg-background px-1 pointer-events-none",
                        "top-1/2 -translate-y-1/2 text-base peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:font-medium",
                        hasValue && "top-0 -translate-y-1/2 text-xs font-medium"
                    )}
                >
                    {label}
                </Label>
            </div>
        )
    }
);
FloatingLabelSelect.displayName = 'FloatingLabelSelect';

export function AddRecurringDialog({ children, itemToEdit }: { children: React.ReactNode; itemToEdit?: RecurringExpense }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const isEditMode = !!itemToEdit;

    const accountsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/accounts`), orderBy('name', 'asc')) : null, [user, firestore]);
    const categoriesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/categories`), orderBy('name', 'asc')) : null, [user, firestore]);
    const { data: accounts } = useCollection<Account>(accountsQuery);
    const { data: categories } = useCollection<Category>(categoriesQuery);

    const form = useForm<RecurringFormData>({
        resolver: zodResolver(recurringSchema),
        defaultValues: {
            name: '',
            amount: '' as any,
            type: 'expense',
            frequency: 'monthly',
            startDate: new Date(),
            categoryId: '',
            accountId: '',
            description: '',
        },
    });

    useEffect(() => {
        if(open) {
            if (isEditMode && itemToEdit) {
                form.reset({
                    name: itemToEdit.name,
                    amount: itemToEdit.amount,
                    type: itemToEdit.type,
                    frequency: itemToEdit.frequency,
                    startDate: itemToEdit.startDate instanceof Date ? itemToEdit.startDate : (itemToEdit.startDate as any).toDate(),
                    categoryId: itemToEdit.categoryId || '',
                    accountId: itemToEdit.accountId || '',
                    description: itemToEdit.description || '',
                });
            } else {
                form.reset({
                    name: '',
                    amount: '' as any,
                    type: 'expense',
                    frequency: 'monthly',
                    startDate: new Date(),
                    categoryId: '',
                    accountId: '',
                    description: '',
                });
            }
        }
    }, [open, form, isEditMode, itemToEdit]);

    async function onSubmit(values: RecurringFormData) {
        setIsLoading(true);
        if (!firestore || !user) return;

        const recurringData = {
            ...values,
            userId: user.uid,
            status: itemToEdit?.status || 'active',
            nextDueDate: values.startDate,
            createdAt: serverTimestamp(),
        };

        try {
            if (isEditMode && itemToEdit) {
                const docRef = doc(firestore, `users/${user.uid}/recurringExpenses`, itemToEdit.id);
                await setDocumentNonBlocking(docRef, recurringData, { merge: true });
                toast({ title: 'Recurring item updated' });
            } else {
                const colRef = collection(firestore, `users/${user.uid}/recurringExpenses`);
                await addDocumentNonBlocking(colRef, recurringData);
                toast({ title: 'Recurring item added' });
            }
            setOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error saving item' });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit' : 'Add'} Recurring Item</DialogTitle>
                    <DialogDescription>Automate your regular expenses or income.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FloatingLabelInput label="Name *" id="name" {...field} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FloatingLabelInput label="Amount *" id="amount" type="number" step="0.01" {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FloatingLabelSelect label="Type *" id="type" onValueChange={field.onChange} value={field.value}>
                                            <SelectItem value="expense">Expense</SelectItem>
                                            <SelectItem value="income">Income</SelectItem>
                                        </FloatingLabelSelect>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="frequency"
                            render={({ field }) => (
                                <FormItem>
                                    <FloatingLabelSelect label="Frequency *" id="freq" onValueChange={field.onChange} value={field.value}>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                    </FloatingLabelSelect>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                                <FormItem>
                                    <Label className="text-xs text-muted-foreground px-1">Start Date *</Label>
                                    <DateTimePicker field={field} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="accountId"
                            render={({ field }) => (
                                <FormItem>
                                    <FloatingLabelSelect label="Default Account" id="acc" onValueChange={field.onChange} value={field.value}>
                                        {accounts?.map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>
                                                <div className="flex items-center">{renderIcon(acc.icon)}{acc.name}</div>
                                            </SelectItem>
                                        ))}
                                    </FloatingLabelSelect>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <FloatingLabelSelect label="Category" id="cat" onValueChange={field.onChange} value={field.value}>
                                        {categories?.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                <div className="flex items-center">{renderIcon(cat.icon)}{cat.name}</div>
                                            </SelectItem>
                                        ))}
                                    </FloatingLabelSelect>
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}