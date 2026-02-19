'use client';

import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input, InputProps } from '@/components/ui/input';
import { Loader2, Pilcrow, PlusCircle, X, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import * as React from 'react';
import { useState, useMemo, useEffect, useCallback, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, commitBatchNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch, query, orderBy } from 'firebase/firestore';
import { UserProfile, Category, Tag, Account, EnrichedExpense } from '@/lib/types';
import * as LucideIcons from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { suggestExpenseDetails } from '@/ai/flows/suggest-expense-details';
import { availableIcons } from '@/lib/defaults';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandPrimitive } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { generateColorStyle } from '@/lib/utils';
import { useDebounce } from 'use-debounce';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DateTimePicker } from '@/components/DateTimePicker';

// Type-safe dynamic schema creation
const createExpenseSchema = (settings?: UserProfile['expenseFieldSettings']) => {
  const shape = {
    type: z.enum(['expense', 'income']).default('expense'),
    date: z.date({ required_error: 'A date is required.' }),
    amount: z.coerce.number({ invalid_type_error: 'Please enter a valid amount.' }).positive({ message: 'Amount must be positive.' }),
    accountId: z.string().min(1, 'Please select an account.'),
    categoryId: settings?.isCategoryRequired ? z.string().min(1, 'Category is required.') : z.string().optional(),
    description: settings?.isDescriptionRequired ? z.string().min(1, 'Description is required.') : z.string().optional(),
    tagIds: settings?.isTagRequired ? z.array(z.string()).min(1, 'At least one tag is required.') : z.array(z.string()).optional(),
  };

  return z.object(shape);
};

export function ExpenseForm({
  form,
  onSubmit,
  id,
}: {
  form: UseFormReturn<any>;
  onSubmit: (e: React.BaseSyntheticEvent) => Promise<void>;
  id: string;
}) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const transactionType = form.watch('type');
    const descriptionValue = form.watch('description');
    const categoryIdValue = form.watch('categoryId');
    const tagIdsValue = form.watch('tagIds');

    const [debouncedDescription] = useDebounce(descriptionValue, 500);
    const [debouncedCategoryId] = useDebounce(categoryIdValue, 500);
    const [debouncedTagIds] = useDebounce(tagIdsValue, 500);
    
    const [isSuggesting, startSuggestionTransition] = useTransition();

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
     
    const accountsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/accounts`), orderBy('name', 'asc')) : null, [user, firestore]);
    const categoriesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/categories`), orderBy('name', 'asc')) : null, [user, firestore]);
    const tagsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/tags`), orderBy('name', 'asc')) : null, [user, firestore]);

    const { data: userAccounts } = useCollection<Account>(accountsQuery);
    const { data: userCategories } = useCollection<Category>(categoriesQuery);
    const { data: userTags } = useCollection<Tag>(tagsQuery);

    const activeAccounts = useMemo(() => userAccounts?.filter(acc => acc.status === 'active' || acc.status === undefined) || [], [userAccounts]);
    const activeCategories = useMemo(() => userCategories?.filter(c => c.status === 'active' || c.status === undefined) || [], [userCategories]);
    const activeTags = useMemo(() => userTags?.filter(t => t.status === 'active' || t.status === undefined) || [], [userTags]);
    
    const isAiSuggestionEnabled = userProfile?.dashboardSettings?.isAiSuggestionEnabled ?? true;

    const renderIcon = (iconName: string | undefined, className?: string) => {
        if (!iconName) return <Pilcrow className={cn("mr-2 h-4 w-4", className)} />;
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className={cn("mr-2 h-4 w-4", className)} /> : <Pilcrow className={cn("mr-2 h-4 w-4", className)} />;
    };

    useEffect(() => {
        const hasInput = debouncedDescription || debouncedCategoryId || (debouncedTagIds && debouncedTagIds.length > 0);
        if (!hasInput || !isAiSuggestionEnabled || !userProfile?.dashboardSettings?.isAiSuggestionEnabled || activeCategories.length === 0 || activeAccounts.length === 0) {
            return;
        }

        startSuggestionTransition(async () => {
            try {
                const selectedCategory = activeCategories.find(c => c.id === debouncedCategoryId);
                const selectedTags = activeTags.filter(t => debouncedTagIds?.includes(t.id));

                const suggestions = await suggestExpenseDetails({
                    description: debouncedDescription || '',
                    categories: activeCategories.map(({ id, name }) => ({ id, name })),
                    tags: activeTags.map(({ id, name }) => ({ id, name })),
                    accounts: activeAccounts.map(({ id, name }) => ({ id, name })),
                    selectedCategoryId: debouncedCategoryId,
                    selectedCategoryName: selectedCategory?.name,
                    selectedTagIds: debouncedTagIds,
                    selectedTagNames: selectedTags.map(t => t.name),
                });
                
                if (suggestions.categoryId && !form.getFieldState('categoryId').isDirty) form.setValue('categoryId', suggestions.categoryId, { shouldValidate: true });
                if (suggestions.accountId && !form.getFieldState('accountId').isDirty) form.setValue('accountId', suggestions.accountId, { shouldValidate: true });
                if (suggestions.tagIds && !form.getFieldState('tagIds').isDirty) form.setValue('tagIds', suggestions.tagIds, { shouldValidate: true });
                
                if (suggestions.description && suggestions.description !== debouncedDescription && !form.getFieldState('description').isDirty) {
                    form.setValue('description', suggestions.description, { shouldValidate: true });
                }
            } catch (error) {
                console.error("AI suggestion failed:", error);
            }
        });

    }, [debouncedDescription, debouncedCategoryId, debouncedTagIds, form, activeCategories, activeTags, activeAccounts, isAiSuggestionEnabled, userProfile]);

    const isDescriptionRequired = userProfile?.expenseFieldSettings?.isDescriptionRequired ?? false;
    const isTagRequired = userProfile?.expenseFieldSettings?.isTagRequired ?? false;
    const isCategoryRequired = userProfile?.expenseFieldSettings?.isCategoryRequired ?? true;
    
    const fieldOrder = userProfile?.transactionFieldOrder || ['description', 'accountId', 'categoryId', 'tagIds'];
    let visibleFields = userProfile?.expenseFieldSettings?.visibleFields || ['description', 'accountId', 'categoryId', 'tagIds'];

    return (
        <Form {...form}>
            <form id={id} onSubmit={onSubmit} className="space-y-4">
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-2 gap-4"
                            >
                                <FormItem>
                                    <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base cursor-pointer transition-all", field.value === 'expense' ? "border-destructive text-destructive bg-destructive/5" : "border-muted")}>
                                        <RadioGroupItem value="expense" className="sr-only" />
                                        <span className="font-bold">Cash Out</span>
                                    </Label>
                                </FormItem>
                                 <FormItem>
                                    <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base cursor-pointer transition-all", field.value === 'income' ? "border-green-600 text-green-600 bg-green-600/5" : "border-muted")}>
                                        <RadioGroupItem value="income" className="sr-only" />
                                        <span className="font-bold">Cash In</span>
                                    </Label>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 
                 <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem>
                            <DateTimePicker field={field} />
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    key="amount"
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                             <div className="relative">
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...field}
                                    value={field.value ?? ''}
                                    className={cn(
                                        'h-14 pt-2 text-2xl font-bold text-center border-2 rounded-xl focus-visible:ring-0',
                                        transactionType === 'expense' ? 'text-destructive border-destructive/20 focus:border-destructive' : 'text-green-600 border-green-600/20 focus:border-green-600'
                                    )}
                                />
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                {fieldOrder.filter(f => visibleFields.includes(f)).map(fieldName => {
                    if (fieldName === 'description') {
                        return (
                            <FormField
                                key="description"
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <Input placeholder={`Description${isDescriptionRequired ? ' *' : ''}`} {...field} value={field.value ?? ''} className="h-12 rounded-xl" />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )
                    }
                    if (fieldName === 'accountId') {
                        return (
                            <FormField
                                key="accountId"
                                control={form.control}
                                name="accountId"
                                render={({ field }) => (
                                    <FormItem>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-12 rounded-xl">
                                                    <SelectValue placeholder="Select Account *" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {activeAccounts?.map(acc => (
                                                    <SelectItem key={acc.id} value={acc.id}>
                                                        <div className="flex items-center">
                                                            {renderIcon(acc.icon)}
                                                            {acc.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )
                    }
                    if (fieldName === 'categoryId') {
                        return (
                            <FormField
                                key="categoryId"
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-12 rounded-xl">
                                                    <SelectValue placeholder={`Category${isCategoryRequired ? ' *' : ''}`} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="__none__">No Category</SelectItem>
                                                {activeCategories?.map(cat => (
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
                        )
                    }
                    return null;
                })}
            </form>
        </Form>
    );
}

export function useExpenseForm({
    setOpen,
    expenseToEdit,
    initialType,
    onSaveSuccess,
}: {
    setOpen: (open: boolean) => void;
    expenseToEdit?: EnrichedExpense;
    initialType?: 'income' | 'expense';
    onSaveSuccess?: () => void;
}) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const formId = useMemo(() => `expense-form-${Math.random().toString(36).substring(7)}`, []);
    const isEditMode = !!expenseToEdit;

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const expenseSchema = useMemo(() => createExpenseSchema(userProfile?.expenseFieldSettings), [userProfile?.expenseFieldSettings]);

    const form = useForm<z.infer<typeof expenseSchema>>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            type: expenseToEdit?.type || initialType || 'expense',
            amount: expenseToEdit?.amount || undefined,
            date: expenseToEdit?.date || new Date(),
            accountId: expenseToEdit?.account?.id || userProfile?.expenseFieldSettings?.defaultAccountId || '',
            categoryId: expenseToEdit?.category?.id || '',
            description: expenseToEdit?.description || '',
            tagIds: expenseToEdit?.tags?.map(t => t.id) || [],
        },
    });

    const handleTransactionSave = async (values: z.infer<typeof expenseSchema>, action: 'save' | 'saveAndNew') => {
        if (!firestore || !user) return false;
        setIsLoading(true);

        try {
            const batch = writeBatch(firestore);
            const expenseCol = collection(firestore, `users/${user.uid}/expenses`);
            const expenseRef = isEditMode ? doc(firestore, `users/${user.uid}/expenses`, expenseToEdit!.id) : doc(expenseCol);

            const finalCategoryId = values.categoryId === '__none__' ? undefined : values.categoryId;
            const expenseData: any = {
                id: expenseRef.id,
                userId: user.uid,
                type: values.type,
                amount: values.amount,
                description: values.description || '',
                date: values.date,
                createdAt: isEditMode ? expenseToEdit!.createdAt : serverTimestamp(),
                updatedAt: serverTimestamp(),
                tagIds: values.tagIds || [],
                categoryId: finalCategoryId,
                accountId: values.accountId,
            };

            if (isEditMode) {
                batch.update(expenseRef, expenseData);
            } else {
                batch.set(expenseRef, expenseData);
            }

            // Update balance
            const accountRef = doc(firestore, `users/${user.uid}/accounts`, values.accountId);
            const amountChange = values.type === 'income' ? values.amount : -values.amount;
            
            if (isEditMode && expenseToEdit) {
                const oldAmountChange = expenseToEdit.type === 'income' ? expenseToEdit.amount : -expenseToEdit.amount;
                if (expenseToEdit.account?.id === values.accountId) {
                    batch.update(accountRef, { balance: increment(amountChange - oldAmountChange) });
                } else if (expenseToEdit.account?.id) {
                    const oldAccountRef = doc(firestore, `users/${user.uid}/accounts`, expenseToEdit.account.id);
                    batch.update(oldAccountRef, { balance: increment(-oldAmountChange) });
                    batch.update(accountRef, { balance: increment(amountChange) });
                }
            } else {
                batch.update(accountRef, { balance: increment(amountChange) });
            }

            await commitBatchNonBlocking(batch, `users/${user.uid}/expenses`);
            toast({ title: isEditMode ? 'Transaction Updated' : 'Transaction Added' });
            onSaveSuccess?.();
            return true;
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Saving Transaction', description: error.message });
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const onFinalSubmit = form.handleSubmit(async (values) => {
        const success = await handleTransactionSave(values, 'save');
        if (success) setOpen(false);
    });

    const onSaveAndNewSubmit = form.handleSubmit(async (values) => {
        const success = await handleTransactionSave(values, 'saveAndNew');
        if (success) {
            form.reset({
                ...form.getValues(),
                amount: undefined,
                description: '',
                categoryId: '',
                tagIds: [],
            });
        }
    });

    const handleDelete = async () => {
        if (!firestore || !user || !expenseToEdit) return;
        setIsLoading(true);
        try {
            const batch = writeBatch(firestore);
            const expenseRef = doc(firestore, `users/${user.uid}/expenses`, expenseToEdit.id);
            const accountRef = doc(firestore, `users/${user.uid}/accounts`, expenseToEdit.account!.id);
            const amountReversal = expenseToEdit.type === 'income' ? -expenseToEdit.amount : expenseToEdit.amount;

            batch.delete(expenseRef);
            batch.update(accountRef, { balance: increment(amountReversal) });

            await commitBatchNonBlocking(batch, `users/${user.uid}/expenses`);
            toast({ title: 'Transaction Deleted' });
            onSaveSuccess?.();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return { form, onFinalSubmit, onSaveAndNewSubmit, handleDelete, isLoading, isEditMode, formId };
}