'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input, InputProps } from '@/components/ui/input';
import { Loader2, Pilcrow, Trash2, PlusCircle, X, Check } from 'lucide-react';
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
import { cn, generateColorStyle } from '@/lib/utils';
import { suggestExpenseDetails } from '@/ai/flows/suggest-expense-details';
import { availableIcons } from '@/lib/defaults';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandPrimitive } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from 'use-debounce';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DateTimePicker } from '@/components/DateTimePicker';
import { Button } from '@/components/ui/button';

// --- Helper Logic ---

const createExpenseSchema = (settings?: UserProfile['expenseFieldSettings']) => {
  const shape: any = {
    type: z.enum(['expense', 'income']).default('expense'),
    date: z.date({ required_error: 'A date is required.' }),
    amount: z.coerce.number({ invalid_type_error: 'Please enter a valid amount.' }).positive({ message: 'Amount must be positive.' }),
    accountId: z.string().min(1, 'Please select an account.'),
    categoryId: z.string().optional().or(z.literal('')),
    description: z.string().optional().or(z.literal('')),
    tagIds: z.array(z.string()).optional(),
  };

  if (settings?.isCategoryRequired) {
    shape.categoryId = z.string().min(1, 'Category is required.');
  }
  if (settings?.isDescriptionRequired) {
    shape.description = z.string().min(1, 'Description is required.');
  }
  if (settings?.isTagRequired) {
    shape.tagIds = z.array(z.string()).min(1, 'At least one tag is required.');
  }

  return z.object(shape);
};

// --- Internal Components ---

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
        if (onOpenChange) onOpenChange(newOpen);
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
        const currentIds = field.value || [];
        field.onChange(currentIds.filter((id: string) => id !== tagId));
    }, [field]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const input = inputRef.current;
        if (input) {
            if (e.key === "Delete" || e.key === "Backspace") {
                if (input.value === "" && selectedTagIds.size > 0) {
                    const tagIdsArray = Array.from(selectedTagIds) as string[];
                    const lastTagId = tagIdsArray[tagIdsArray.length - 1];
                    if(lastTagId) {
                      handleUnselect(lastTagId);
                    }
                }
            }
            if (e.key === "Escape") input.blur();
        }
    };
    
    const filteredTags = useMemo(() => {
        const query = inputValue.toLowerCase().trim();
        return tags.filter(tag =>
            tag.name.toLowerCase().includes(query)
        );
    }, [tags, inputValue]);

    const renderIcon = (iconName: string | undefined, className?: string) => {
        if (!iconName) return null;
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className={cn("h-4 w-4", className)} /> : <Pilcrow className={cn("h-4 w-4", className)} />;
    };

    return (
        <Command shouldFilter={false} onKeyDown={handleKeyDown} className={cn('overflow-visible bg-transparent', isSuggesting && 'animate-pulse border-primary/50')}>
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
                        onValueChange={(val) => {
                            setInputValue(val);
                            if (val.length >= 0) setOpen(true);
                        }}
                        onBlur={() => setTimeout(() => setOpen(false), 200)}
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
                                <CommandGroup className={cn(
                                    "p-2",
                                    tags.length > 10 ? 'grid grid-cols-2 gap-1' : 'flex flex-col gap-1'
                                )}>
                                    <QuickAddItemDialog type="Tag" onSave={onQuickAdd} onOpenChange={setOpen}>
                                        <div className="flex items-center gap-2 p-2 text-sm text-primary cursor-pointer w-full hover:bg-accent rounded-sm">
                                            <PlusCircle className="h-4 w-4" /> Create new tag
                                        </div>
                                    </QuickAddItemDialog>
                                    {filteredTags.map(tag => (
                                        <CommandItem
                                            key={tag.id}
                                            value={tag.id}
                                            onSelect={() => { 
                                                setInputValue(""); 
                                                const currentIds = field.value || [];
                                                const newIds = selectedTagIds.has(tag.id)
                                                    ? currentIds.filter((id: string) => id !== tag.id)
                                                    : [...currentIds, tag.id];
                                                field.onChange(newIds); 
                                            }}
                                            className={cn("flex items-center justify-between cursor-pointer rounded-md border px-2 py-1", selectedTagIds.has(tag.id) && "bg-muted")}
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

function ExpenseForm({ form, onSubmit, id, accounts, categories, tags, isEditMode }: { form: UseFormReturn<any>; onSubmit: (e: React.BaseSyntheticEvent) => Promise<void>; id: string; accounts: Account[]; categories: Category[]; tags: Tag[]; isEditMode: boolean; }) {
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
     
    const activeAccounts = useMemo(() => accounts?.filter(acc => acc.status === 'active' || acc.status === undefined) || [], [accounts]);
    const activeCategories = useMemo(() => categories?.filter(c => c.status === 'active' || c.status === undefined) || [], [categories]);
    const activeTags = useMemo(() => tags?.filter(t => t.status === 'active' || t.status === undefined) || [], [tags]);
    
    const isAiSuggestionEnabled = userProfile?.dashboardSettings?.isAiSuggestionEnabled ?? false;

    const renderIcon = (iconName: string | undefined, className?: string) => {
        const IconComponent = (LucideIcons as any)[iconName || 'Pilcrow'];
        return IconComponent ? <IconComponent className={cn("mr-2 h-4 w-4", className)} /> : <Pilcrow className={cn("mr-2 h-4 w-4", className)} />;
    };

    useEffect(() => {
        if (isEditMode) return;
        
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
    }, [debouncedDescription, debouncedCategoryId, debouncedTagIds, form, activeCategories, activeTags, activeAccounts, isAiSuggestionEnabled, isEditMode]);

    const isDescriptionRequired = userProfile?.expenseFieldSettings?.isDescriptionRequired ?? false;
    const isTagRequired = userProfile?.expenseFieldSettings?.isTagRequired ?? false;
    const isCategoryRequired = userProfile?.expenseFieldSettings?.isCategoryRequired ?? true;
    
    const fieldOrder = userProfile?.transactionFieldOrder || ['description', 'accountId', 'categoryId', 'tagIds'];
    let visibleFields = userProfile?.expenseFieldSettings?.visibleFields || ['description', 'accountId', 'categoryId', 'tagIds'];

    const handleQuickAdd = async (type: 'Category' | 'Tag', name: string, icon: string): Promise<string | undefined> => {
        if (!user || !firestore) return;
        const ref = collection(firestore, `users/${user.uid}/${type === 'Category' ? 'categories' : 'tags'}`);
        try {
            const newDocRef = doc(ref);
            const docId = newDocRef.id;
            await setDocumentNonBlocking(newDocRef, { id: docId, name, icon, userId: user.uid, status: 'active' });
            toast({ title: `${type} Added` });
            if (type === 'Category') form.setValue('categoryId', docId, { shouldValidate: true });
            else {
                const currentTagIds = form.getValues('tagIds') || [];
                form.setValue('tagIds', [...currentTagIds, docId], { shouldValidate: true });
            }
            return docId;
        } catch (error) {
            toast({ variant: 'destructive', title: `Error Adding ${type}` });
            return undefined;
        }
    };

    const formFields: Record<string, React.ReactNode> = {
        description: (
            <FormField key="description" control={form.control} name="description" render={({ field }) => (
                <FormItem>
                    <FloatingLabelInput label={`Description${isDescriptionRequired ? ' *' : ''}`} id="description" {...field} value={field.value ?? ''} className={cn(isSuggesting && 'animate-pulse border-primary/50')} />
                    <FormMessage />
                </FormItem>
            )} />
        ),
        accountId: (
             <FormField key="accountId" control={form.control} name="accountId" render={({ field }) => (
                <FormItem>
                    <FloatingLabelSelect label="Account *" id="accountId" onValueChange={field.onChange} value={field.value}>
                        {activeAccounts?.map(acc => (
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
                    <FloatingLabelSelect label={`Category${isCategoryRequired ? ' *' : ''}`} id="categoryId" onValueChange={field.onChange} value={field.value}>
                        <QuickAddItemDialog type="Category" onSave={(name, icon) => handleQuickAdd('Category', name, icon)}>
                            <div className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent rounded-md text-primary"><PlusCircle className="h-4 w-4" />Create new category</div>
                        </QuickAddItemDialog>
                        <SelectItem value="__none__">No Category</SelectItem>
                        {activeCategories?.map(cat => (
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
                    <TagCombobox field={field} tags={activeTags} onQuickAdd={(name, icon) => handleQuickAdd('Tag', name, icon)} isRequired={isTagRequired} isSuggesting={isSuggesting} />
                    <FormMessage />
                </FormItem>
            )} />
        )
    }

    return (
        <Form {...form}>
            <form id={id} onSubmit={onSubmit} className="space-y-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem><FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                            <FormItem><Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base cursor-pointer transition-all", field.value === 'expense' ? "border-destructive text-destructive bg-destructive/5" : "border-muted")}><RadioGroupItem value="expense" className="sr-only" /><span>Cash Out</span></Label></FormItem>
                            <FormItem><Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base cursor-pointer transition-all", field.value === 'income' ? "border-green-600 text-green-600 bg-green-600/5" : "border-muted")}><RadioGroupItem value="income" className="sr-only" /><span>Cash In</span></Label></FormItem>
                        </RadioGroup>
                    </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><DateTimePicker field={field} /><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FloatingLabelInput label="Amount *" id="amount" type="number" {...field} value={field.value ?? ''} className={cn('font-bold', transactionType === 'expense' ? 'text-red-500' : 'text-green-600')} /><FormMessage /></FormItem>
                )} />
                {fieldOrder.filter(f => visibleFields.includes(f)).map(fieldName => formFields[fieldName])}
            </form>
        </Form>
    );
}

export function AddExpenseDialog({ children, expenseToEdit, initialType, onSaveSuccess }: { children: React.ReactNode, expenseToEdit?: EnrichedExpense, initialType?: 'income' | 'expense'; onSaveSuccess?: () => void; }) {
    const [open, setOpen] = useState(false);
    const { form, onFinalSubmit, onSaveAndNewSubmit, handleDelete, loadingState, isEditMode, formId, accounts, categories, tags } = useExpenseForm({ setOpen, expenseToEdit, initialType, open, onSaveSuccess });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] flex flex-col max-h-[90vh] rounded-[24px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader><DialogTitle className="font-headline">{isEditMode ? 'Edit Transaction' : 'Add a New Transaction'}</DialogTitle></DialogHeader>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <ExpenseForm 
                        form={form} 
                        onSubmit={onFinalSubmit} 
                        id={formId} 
                        accounts={accounts || []} 
                        categories={categories || []} 
                        tags={tags || []} 
                        isEditMode={isEditMode}
                    />
                </div>
                <DialogFooter className="w-full pt-4">
                    {isEditMode ? (
                        <div className="flex items-center justify-between w-full">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" variant="destructive" disabled={loadingState !== 'idle'}>
                                        {loadingState === 'delete' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                        Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[24px]">
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <Button type="submit" form={formId} disabled={loadingState !== 'idle'} className="min-w-[120px] text-[14px]">
                                {loadingState === 'save' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 w-full">
                            <DialogClose asChild><Button type="button" variant="outline" className="w-full text-[14px] px-1">Cancel</Button></DialogClose>
                            <Button type="button" onClick={onSaveAndNewSubmit} disabled={loadingState !== 'idle'} variant="outline" className="w-full text-[14px] border-primary text-primary px-1">{loadingState === 'saveAndNew' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & New'}</Button>
                            <Button type="submit" form={formId} disabled={loadingState !== 'idle'} className="w-full text-[14px] px-1">{loadingState === 'save' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save'}</Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function useExpenseForm({ setOpen, expenseToEdit, initialType, open, onSaveSuccess }: { setOpen: (open: boolean) => void; expenseToEdit?: EnrichedExpense; initialType?: 'income' | 'expense'; open: boolean; onSaveSuccess?: () => void; }) {
    const { toast } = useToast();
    const [loadingState, setLoadingState] = useState<'idle' | 'save' | 'saveAndNew' | 'delete'>('idle');
    const { user } = useUser();
    const firestore = useFirestore();
    const formId = useMemo(() => `expense-form-${Math.random().toString(36).substring(7)}`, []);
    const isEditMode = !!expenseToEdit;

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const userCategoriesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/categories`), orderBy('name', 'asc')) : null, [user, firestore]);
    const userAccountsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/accounts`), orderBy('name', 'asc')) : null, [user, firestore]);
    const userTagsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/tags`), orderBy('name', 'asc')) : null, [user, firestore]);

    const { data: categories } = useCollection<Category>(userCategoriesQuery);
    const { data: accounts } = useCollection<Account>(userAccountsQuery);
    const { data: tags } = useCollection<Tag>(userTagsQuery);

    const expenseSchema = useMemo(() => createExpenseSchema(userProfile?.expenseFieldSettings), [userProfile?.expenseFieldSettings]);
    const getNewFormValues = useCallback((keepDate?: Date, keepAccount?: string) => ({
        type: initialType || 'expense', amount: undefined, date: keepDate || new Date(),
        accountId: keepAccount || userProfile?.expenseFieldSettings?.defaultAccountId || '',
        categoryId: '', description: '', tagIds: [],
    }), [initialType, userProfile]);
    
    const form = useForm<z.infer<typeof expenseSchema>>({ resolver: zodResolver(expenseSchema), defaultValues: getNewFormValues() });
    
    useEffect(() => {
        if (open) {
            if (isEditMode && expenseToEdit) form.reset({ type: expenseToEdit.type, amount: expenseToEdit.amount, date: expenseToEdit.date, accountId: expenseToEdit.account?.id || '', categoryId: expenseToEdit.category?.id || '', description: expenseToEdit.description || '', tagIds: expenseToEdit.tags?.map(t => t.id) || [] });
            else form.reset(getNewFormValues());
        }
    }, [open, isEditMode, expenseToEdit, form, getNewFormValues]);

    const handleTransactionSave = async (values: z.infer<typeof expenseSchema>, action: 'save' | 'saveAndNew') => {
        if (!firestore || !user || !categories || !accounts) return false;
        setLoadingState(action);
        try {
            const batch = writeBatch(firestore);
            const expenseRef = isEditMode ? doc(firestore, `users/${user.uid}/expenses`, expenseToEdit!.id) : doc(collection(firestore, `users/${user.uid}/expenses`));
            
            const amountChange = values.type === 'income' ? values.amount : -values.amount;

            if (isEditMode && expenseToEdit) {
                const oldAmountChange = expenseToEdit.type === 'income' ? expenseToEdit.amount : -expenseToEdit.amount;
                const accountRef = doc(firestore, `users/${user.uid}/accounts`, values.accountId);
                if (expenseToEdit.account?.id === values.accountId) {
                    batch.update(accountRef, { balance: increment(amountChange - oldAmountChange) });
                } else if (expenseToEdit.account?.id) {
                    const oldAccountRef = doc(firestore, `users/${user.uid}/accounts`, expenseToEdit.account.id);
                    batch.update(oldAccountRef, { balance: increment(-oldAmountChange) });
                    batch.update(accountRef, { balance: increment(amountChange) });
                }
            } else {
                batch.update(doc(firestore, `users/${user.uid}/accounts`, values.accountId), { balance: increment(amountChange) });
            }

            const finalData = { 
                ...values, 
                id: expenseRef.id, 
                userId: user.uid, 
                updatedAt: serverTimestamp(),
                createdAt: isEditMode ? expenseToEdit!.createdAt : serverTimestamp()
            };
            
            if (isEditMode) {
                batch.update(expenseRef, finalData);
            } else {
                batch.set(expenseRef, finalData);
            }

            await commitBatchNonBlocking(batch, `users/${user.uid}/expenses`);
            toast({ title: isEditMode ? 'Transaction Updated' : 'Transaction Added' });
            onSaveSuccess?.();
            return true;
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error Saving' });
            return false;
        } finally { setLoadingState('idle'); }
    }

    const onFinalSubmit = form.handleSubmit(async (v) => { if (await handleTransactionSave(v, 'save')) setOpen(false); });
    const onSaveAndNewSubmit = form.handleSubmit(async (v) => { if (await handleTransactionSave(v, 'saveAndNew')) form.reset(getNewFormValues(v.date, v.accountId)); });
    
    const handleDelete = async () => {
        if (!firestore || !user || !expenseToEdit || !accounts) return;
        setLoadingState('delete');
        try {
            const batch = writeBatch(firestore);
            const amountReversal = expenseToEdit.type === 'income' ? -expenseToEdit.amount : expenseToEdit.amount;
            batch.delete(doc(firestore, `users/${user.uid}/expenses`, expenseToEdit.id));
            batch.update(doc(firestore, `users/${user.uid}/accounts`, expenseToEdit.account!.id), { balance: increment(amountReversal) });
            await commitBatchNonBlocking(batch, `users/${user.uid}/expenses`);
            setOpen(false);
            onSaveSuccess?.();
        } finally { setLoadingState('idle'); }
    }

    return { form, onFinalSubmit, onSaveAndNewSubmit, handleDelete, loadingState, isEditMode, formId, accounts: accounts || [], categories: categories || [], tags: tags || [] };
}
