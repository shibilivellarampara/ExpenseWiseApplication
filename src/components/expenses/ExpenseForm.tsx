'use client';

import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input, InputProps } from '@/components/ui/input';
import { Loader2, Pilcrow, PlusCircle, X, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as React from 'react';
import { useState, useMemo, useEffect, useCallback, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, commitBatchNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch, increment, query, orderBy } from 'firebase/firestore';
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Function to create a dynamic schema
const createExpenseSchema = (settings?: UserProfile['expenseFieldSettings']) => {
  let schema = z.object({
    type: z.enum(['expense', 'income']).default('expense'),
    date: z.date({ required_error: 'A date is required.' }),
    amount: z.coerce.number({ invalid_type_error: 'Please enter a valid amount.' }).positive({ message: 'Amount must be positive.' }),
    accountId: z.string().min(1, 'Please select an account.'),
    categoryId: z.string().optional(),
    description: z.string().optional(),
    tagIds: z.array(z.string()).optional(),
  });

  if (settings?.isDescriptionRequired) {
    schema = schema.extend({ description: z.string().min(1, 'Description is required.') });
  }
  if (settings?.isTagRequired) {
      schema = schema.extend({ tagIds: z.array(z.string()).min(1, 'At least one tag is required.') });
  }
  if (settings?.isCategoryRequired) {
      schema = schema.extend({ categoryId: z.string().min(1, 'Category is required.') });
  }

  return schema;
};

interface QuickAddItemDialogProps {
    type: 'Category' | 'Tag';
    onSave: (name: string, icon: string) => Promise<string | undefined>;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}

function QuickAddItemDialog({ type, onSave, onOpenChange, children }: QuickAddItemDialogProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [icon, setIcon] = useState(type === 'Category' ? 'Shapes' : 'Tag');
    const [isSaving, setIsSaving] = useState(false);
    const [iconPopoverOpen, setIconPopoverOpen] = useState(false);

    const handleOpen = (newOpen: boolean) => {
        setOpen(newOpen);
        if (onOpenChange) {
            onOpenChange(newOpen);
        }
    }

    const renderIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="h-5 w-5" /> : <Pilcrow className="h-5 w-5" />;
    };

    const handleSave = async () => {
        if (!name) return;
        setIsSaving(true);
        const newId = await onSave(name, icon);
        if (newId) {
            handleOpen(false);
            setName('');
            setIcon(type === 'Category' ? 'Shapes' : 'Tag');
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Add New {type}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Input
                        placeholder={`${type} Name`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                    <Popover open={iconPopoverOpen} onOpenChange={setIconPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                                {renderIcon(icon)}
                                <span className="ml-2">{icon}</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto grid grid-cols-5 gap-2">
                            {availableIcons.map(iconName => (
                                <Button key={iconName} variant="ghost" size="icon" onClick={() => {setIcon(iconName); setIconPopoverOpen(false);}}>
                                    {renderIcon(iconName)}
                                </Button>
                            ))}
                        </PopoverContent>
                    </Popover>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !name}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

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

const TagCombobox = ({ field, tags, onQuickAdd, isRequired, isSuggesting }: { field: any, tags: Tag[], onQuickAdd: (name: string, icon: string) => Promise<string|undefined>, isRequired: boolean, isSuggesting: boolean }) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const selectedTagIds = new Set(field.value || []);

    const handleUnselect = useCallback((tagId: string) => {
        const newSelectedIds = new Set(field.value || []);
        newSelectedIds.delete(tagId);
        field.onChange(Array.from(newSelectedIds));
    }, [field]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const input = inputRef.current;
        if (input) {
            if (e.key === "Delete" || e.key === "Backspace") {
                if (input.value === "" && selectedTagIds.size > 0) {
                    const lastTagId = Array.from(selectedTagIds).pop();
                    if(lastTagId) {
                      const newSelectedIds = new Set(field.value || []);
                      newSelectedIds.delete(lastTagId);
                      field.onChange(Array.from(newSelectedIds));
                    }
                }
            }
            if (e.key === "Escape") {
                input.blur();
            }
        }
    };
    
    const filteredTags = tags.filter(tag =>
        tag.name.toLowerCase().includes(inputValue.toLowerCase())
    );

    const renderIcon = (iconName: string | undefined, className?: string) => {
        if (!iconName) return null;
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className={cn("h-4 w-4", className)} /> : <Pilcrow className={cn("h-4 w-4", className)} />;
    };

    return (
        <Command onKeyDown={handleKeyDown} className={cn('overflow-visible bg-transparent', isSuggesting && 'animate-pulse border-primary/50')}>
             <div className="group rounded-md border border-input text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 bg-background">
                 <div className="flex gap-1.5 flex-wrap p-2 items-center min-h-14">
                    {tags.filter(tag => selectedTagIds.has(tag.id)).map(tag => (
                        <Badge
                            key={tag.id}
                            style={generateColorStyle(tag.name)}
                            className="badge-colorful"
                        >
                            {tag.name}
                            <button
                                type="button"
                                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                onClick={() => handleUnselect(tag.id)}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                    <CommandPrimitive.Input
                        ref={inputRef}
                        value={inputValue}
                        onValueChange={setInputValue}
                        onBlur={() => setOpen(false)}
                        onFocus={() => setOpen(true)}
                        placeholder={selectedTagIds.size > 0 ? "" : `Tags ${isRequired ? '*' : ''}`}
                        className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-base md:text-sm h-full p-0 border-none shadow-none focus-visible:ring-0"
                    />
                </div>
            </div>
            <div className="relative mt-2">
                {open && (
                    <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
                        <CommandList>
                            <ScrollArea className="h-48">
                                <CommandGroup className="p-2 flex flex-col gap-1">
                                    <QuickAddItemDialog type="Tag" onSave={onQuickAdd} onOpenChange={setOpen}>
                                        <div className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent rounded-md text-primary text-sm font-medium">
                                            <PlusCircle className="h-4 w-4" />
                                            Create new tag
                                        </div>
                                    </QuickAddItemDialog>
                                    {filteredTags.map(tag => (
                                        <CommandItem
                                            key={tag.id}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                            onSelect={() => {
                                                setInputValue("")
                                                field.onChange([...selectedTagIds, tag.id])
                                            }}
                                            className={cn(
                                                "flex items-center justify-between cursor-pointer rounded-md border px-2 py-1",
                                                selectedTagIds.has(tag.id) && "bg-muted"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                {renderIcon(tag.icon)}
                                                <span className="truncate">{tag.name}</span>
                                            </div>
                                            <Check className={cn("h-4 w-4", selectedTagIds.has(tag.id) ? "opacity-100" : "opacity-0")} />
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </ScrollArea>
                        </CommandList>
                    </div>
                )}
            </div>
        </Command>
    );
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
    
    const categoriesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/categories`), orderBy('name', 'asc')) : null, [user, firestore]);
    const accountsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/accounts`), orderBy('name', 'asc')) : null, [user, firestore]);
    const tagsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/tags`), orderBy('name', 'asc')) : null, [user, firestore]);

    const { data: userCategories } = useCollection<Category>(categoriesQuery);
    const { data: userAccounts } = useCollection<Account>(accountsQuery);
    const { data: userTags } = useCollection<Tag>(tagsQuery);

    const activeAccounts = useMemo(() => userAccounts?.filter(acc => acc.status === 'active') || [], [userAccounts]);
    const activeCategories = useMemo(() => userCategories?.filter(c => c.status === 'active') || [], [userCategories]);
    const activeTags = useMemo(() => userTags?.filter(t => t.status === 'active') || [], [userTags]);
    
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
                
                if (suggestions.categoryId && !form.getFieldState('categoryId').isDirty) form.setValue('categoryId', suggestions.categoryId);
                if (suggestions.accountId && !form.getFieldState('accountId').isDirty) form.setValue('accountId', suggestions.accountId);
                if (suggestions.tagIds && !form.getFieldState('tagIds').isDirty) form.setValue('tagIds', suggestions.tagIds);
                if (suggestions.description && !form.getFieldState('description').isDirty) form.setValue('description', suggestions.description);
            } catch (error) {
                console.error("AI suggestion failed:", error);
            }
        });
    }, [debouncedDescription, debouncedCategoryId, debouncedTagIds, form, activeCategories, activeTags, activeAccounts, isAiSuggestionEnabled]);

    const handleQuickAdd = async (type: 'Category' | 'Tag', name: string, icon: string): Promise<string | undefined> => {
        if (!user || !firestore) return;
        const ref = collection(firestore, `users/${user.uid}/${type.toLowerCase()}s`);
        try {
            const newDocRef = doc(ref);
            await setDocumentNonBlocking(newDocRef, { id: newDocRef.id, name, icon, userId: user.uid, status: 'active' });
            toast({ title: `${type} Added` });
            return newDocRef.id;
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error Adding Item' });
            return undefined;
        }
    };
    
    const fieldOrder = userProfile?.transactionFieldOrder || ['description', 'accountId', 'categoryId', 'tagIds'];
    const visibleFields = userProfile?.expenseFieldSettings?.visibleFields || ['description', 'accountId', 'categoryId', 'tagIds'];

    const fields: Record<string, React.ReactNode> = {
        description: (
            <FormField key="description" control={form.control} name="description" render={({ field }) => (
                <FormItem>
                    <FloatingLabelInput label="Description" id="description" {...field} value={field.value ?? ''} className={cn(isSuggesting && 'animate-pulse border-primary/50')} />
                    <FormMessage />
                </FormItem>
            )} />
        ),
        accountId: (
            <FormField key="accountId" control={form.control} name="accountId" render={({ field }) => (
                <FormItem>
                    <FloatingLabelSelect label="Account *" id="accountId" onValueChange={field.onChange} value={field.value}>
                        {activeAccounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}><div className="flex items-center">{renderIcon(acc.icon)}{acc.name}</div></SelectItem>
                        ))}
                    </FloatingLabelSelect>
                    <FormMessage />
                </FormItem>
            )} />
        ),
        categoryId: (
            <FormField key="categoryId" control={form.control} name="categoryId" render={({ field }) => (
                <FormItem>
                    <FloatingLabelSelect label="Category" id="categoryId" onValueChange={field.onChange} value={field.value}>
                        <QuickAddItemDialog type="Category" onSave={(n, i) => handleQuickAdd('Category', n, i)}>
                            <div className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent rounded-md text-primary text-sm font-medium">
                                <PlusCircle className="h-4 w-4" />
                                Create new category
                            </div>
                        </QuickAddItemDialog>
                        {activeCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}><div className="flex items-center">{renderIcon(cat.icon)}{cat.name}</div></SelectItem>
                        ))}
                    </FloatingLabelSelect>
                    <FormMessage />
                </FormItem>
            )} />
        ),
        tagIds: (
            <FormField key="tagIds" control={form.control} name="tagIds" render={({ field }) => (
                <FormItem>
                    <TagCombobox field={field} tags={activeTags} onQuickAdd={(n, i) => handleQuickAdd('Tag', n, i)} isRequired={userProfile?.expenseFieldSettings?.isTagRequired ?? false} isSuggesting={isSuggesting} />
                    <FormMessage />
                </FormItem>
            )} />
        )
    };

    return (
        <Form {...form}>
            <form id={id} onSubmit={onSubmit} className="space-y-4 pt-2">
                <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                                <FormItem>
                                    <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base", field.value === 'expense' ? "border-destructive text-destructive" : "border-muted")}>
                                        <RadioGroupItem value="expense" className="sr-only" />
                                        <span>Cash Out</span>
                                    </Label>
                                </FormItem>
                                <FormItem>
                                    <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base", field.value === 'income' ? "border-green-600 text-green-600" : "border-muted")}>
                                        <RadioGroupItem value="income" className="sr-only" />
                                        <span>Cash In</span>
                                    </Label>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                    </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem>
                        <DateTimePicker field={field} />
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                        <FloatingLabelInput label="Amount *" id="amount" type="number" step="0.01" {...field} value={field.value ?? ''} className={cn('font-bold', transactionType === 'expense' ? 'text-red-500' : 'text-green-600')} />
                        <FormMessage />
                    </FormItem>
                )} />
                {fieldOrder.filter(f => visibleFields.includes(f)).map(f => fields[f])}
            </form>
        </Form>
    );
}

export function useExpenseForm({ setOpen, expenseToEdit, initialType, onSaveSuccess }: { setOpen: (o: boolean) => void, expenseToEdit?: EnrichedExpense, initialType?: 'income' | 'expense', onSaveSuccess?: () => void }) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const formId = useMemo(() => `expense-form-${Math.random().toString(36).substring(7)}`, []);
    
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const expenseSchema = useMemo(() => createExpenseSchema(userProfile?.expenseFieldSettings), [userProfile]);

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

    const handleSave = async (values: any, stayOpen = false) => {
        if (!user || !firestore) return;
        setIsLoading(true);
        try {
            const batch = writeBatch(firestore);
            const expenseRef = expenseToEdit ? doc(firestore, `users/${user.uid}/expenses`, expenseToEdit.id) : doc(collection(firestore, `users/${user.uid}/expenses`));
            
            const data = { ...values, id: expenseRef.id, userId: user.uid, createdAt: expenseToEdit?.createdAt || serverTimestamp(), updatedAt: serverTimestamp() };
            if (!data.categoryId) delete data.categoryId;

            batch.set(expenseRef, data, { merge: true });

            const accountRef = doc(firestore, `users/${user.uid}/accounts`, values.accountId);
            const amountDiff = values.type === 'income' ? values.amount : -values.amount;
            
            if (expenseToEdit) {
                const oldDiff = expenseToEdit.type === 'income' ? expenseToEdit.amount : -expenseToEdit.amount;
                if (expenseToEdit.account?.id === values.accountId) {
                    batch.update(accountRef, { balance: increment(amountDiff - oldDiff) });
                } else {
                    const oldAccountRef = doc(firestore, `users/${user.uid}/accounts`, expenseToEdit.account!.id);
                    batch.update(oldAccountRef, { balance: increment(-oldDiff) });
                    batch.update(accountRef, { balance: increment(amountDiff) });
                }
            } else {
                batch.update(accountRef, { balance: increment(amountDiff) });
            }

            await commitBatchNonBlocking(batch, `users/${user.uid}`);
            toast({ title: expenseToEdit ? 'Updated' : 'Added' });
            onSaveSuccess?.();
            if (!stayOpen) setOpen(false);
            else form.reset({ ...form.getValues(), amount: undefined, description: '' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error Saving' });
        } finally {
            setIsLoading(false);
        }
    };

    const onFinalSubmit = form.handleSubmit((v) => handleSave(v));
    const onSaveAndNewSubmit = form.handleSubmit((v) => handleSave(v, true));

    const handleDelete = async () => {
        if (!user || !firestore || !expenseToEdit) return;
        setIsLoading(true);
        try {
            const batch = writeBatch(firestore);
            batch.delete(doc(firestore, `users/${user.uid}/expenses`, expenseToEdit.id));
            const accountRef = doc(firestore, `users/${user.uid}/accounts`, expenseToEdit.account!.id);
            const reversal = expenseToEdit.type === 'income' ? -expenseToEdit.amount : expenseToEdit.amount;
            batch.update(accountRef, { balance: increment(reversal) });
            await commitBatchNonBlocking(batch, `users/${user.uid}`);
            toast({ title: 'Deleted' });
            onSaveSuccess?.();
            setOpen(false);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error Deleting' });
        } finally {
            setIsLoading(false);
        }
    };

    return { form, onFinalSubmit, onSaveAndNewSubmit, handleDelete, isLoading, isEditMode: !!expenseToEdit, formId };
}
