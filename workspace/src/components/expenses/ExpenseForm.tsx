'use client';

import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Pilcrow, PlusCircle, X, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import * as React from 'react';
import { useState, useMemo, useEffect, useCallback, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, commitBatchNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch, increment, query, orderBy } from 'firebase/firestore';
import { UserProfile, Category, Tag, Account, EnrichedExpense } from '@/lib/types';
import * as LucideIcons from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn, generateColorStyle } from '@/lib/utils';
import { suggestExpenseDetails } from '@/ai/flows/suggest-expense-details';
import { useDebounce } from 'use-debounce';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DateTimePicker } from '@/components/DateTimePicker';

const createExpenseSchema = (settings?: UserProfile['expenseFieldSettings']) => {
  const shape: any = {
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
        if (!hasInput || !isAiSuggestionEnabled || activeCategories.length === 0 || activeAccounts.length === 0) return;

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
    }, [debouncedDescription, debouncedCategoryId, debouncedTagIds, form, activeCategories, activeTags, activeAccounts, isAiSuggestionEnabled]);

    const isDescriptionRequired = userProfile?.expenseFieldSettings?.isDescriptionRequired ?? false;
    const isCategoryRequired = userProfile?.expenseFieldSettings?.isCategoryRequired ?? true;
    
    const fieldOrder = userProfile?.transactionFieldOrder || ['description', 'accountId', 'categoryId', 'tagIds'];
    let visibleFields = userProfile?.expenseFieldSettings?.visibleFields || ['description', 'accountId', 'categoryId', 'tagIds'];

    return (
        <Form {...form}>
            <form id={id} onSubmit={onSubmit} className="space-y-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem><FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                            <FormItem><Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base cursor-pointer transition-all", field.value === 'expense' ? "border-destructive text-destructive" : "border-muted")}><RadioGroupItem value="expense" className="sr-only" /><span>Cash Out</span></Label></FormItem>
                            <FormItem><Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base cursor-pointer transition-all", field.value === 'income' ? "border-green-600 text-green-600" : "border-muted")}><RadioGroupItem value="income" className="sr-only" /><span>Cash In</span></Label></FormItem>
                        </RadioGroup>
                    </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><DateTimePicker field={field} /><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><Input type="number" step="0.01" {...field} value={field.value ?? ''} className={cn('h-14 text-2xl font-bold text-center', transactionType === 'expense' ? 'text-destructive' : 'text-green-600')} /><FormMessage /></FormItem>
                )} />
                {fieldOrder.filter(f => visibleFields.includes(f)).map(fieldName => {
                    if (fieldName === 'description') return <FormField key="description" control={form.control} name="description" render={({ field }) => (<FormItem><Input placeholder={`Description${isDescriptionRequired ? ' *' : ''}`} {...field} value={field.value ?? ''} /><FormMessage /></FormItem>)} />;
                    if (fieldName === 'accountId') return <FormField key="accountId" control={form.control} name="accountId" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Account *" /></SelectTrigger></FormControl><SelectContent>{activeAccounts?.map(acc => (<SelectItem key={acc.id} value={acc.id}><div className="flex items-center">{renderIcon(acc.icon)}{acc.name}</div></SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />;
                    if (fieldName === 'categoryId') return <FormField key="categoryId" control={form.control} name="categoryId" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={`Category${isCategoryRequired ? ' *' : ''}`} /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__">No Category</SelectItem>{activeCategories?.map(cat => (<SelectItem key={cat.id} value={cat.id}><div className="flex items-center">{renderIcon(cat.icon)}{cat.name}</div></SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />;
                    return null;
                })}
            </form>
        </Form>
    );
}
