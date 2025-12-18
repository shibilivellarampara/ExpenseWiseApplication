

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
} from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input, InputProps } from '@/components/ui/input';
import { Loader2, Pilcrow, Trash2, Sparkles, PlusCircle, X, Check, Calendar as CalendarIcon, Clock, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import * as React from 'react';
import { useState, useMemo, useEffect, useCallback, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, commitBatchNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch, increment, query, orderBy } from 'firebase/firestore';
import { UserProfile, Category, Tag, Account, EnrichedExpense } from '@/lib/types';
import * as LucideIcons from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { suggestExpenseDetails } from '@/ai/flows/suggest-expense-details';
import { availableIcons } from '@/lib/defaults';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandPrimitive } from '../ui/command';
import { Badge } from '../ui/badge';
import { generateColorStyle } from '@/lib/utils';
import { useDebounce } from 'use-debounce';
import { ScrollArea } from '../ui/scroll-area';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu';
import { DateTimePicker } from '../DateTimePicker';

// Function to create a dynamic schema
const createExpenseSchema = (settings?: UserProfile['expenseFieldSettings']) => {
  let schema = z.object({
    type: z.enum(['expense', 'income']).default('expense'),
    date: z.date({ required_error: 'A date is required.' }),
    amount: z.coerce.number().positive({ message: 'Amount must be positive.' }),
    accountId: z.string().min(1, 'Please select an account.'),
    
    categoryId: z.string().optional(),
    
    description: z.string().optional(),
    
    tagIds: z.array(z.string()).optional(),
  });

  if (settings?.isDescriptionRequired) {
    schema = schema.extend({ description: z.string().min(1, 'Description is required.').optional() });
  }
  if (settings?.isTagRequired) {
      schema = schema.extend({ tagIds: z.array(z.string()).min(1, 'At least one tag is required.').optional() });
  }
  if (settings?.isCategoryRequired) {
      schema = schema.extend({ categoryId: z.string().min(1, 'Category is required.').optional() });
  }

  return schema;
};

// Component for quick adding of Categories or Tags
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
            <DialogContent>
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

// New FloatingLabelInput component
const FloatingLabelInput = React.forwardRef<HTMLInputElement, InputProps & { label: string }>(
    ({ className, label, id, ...props }, ref) => {
        const hasValue = props.value !== undefined && props.value !== null && String(props.value) !== '';
        return (
            <div className="relative">
                <Input
                    ref={ref}
                    id={id}
                    placeholder=" "
                    className={cn(
                        "peer h-14 pt-5 text-base floating-input", 
                        className
                    )}
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

// Multi-select combobox for tags
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
                                <CommandGroup className={cn(
                                    "p-2",
                                    tags.length > 10 ? 'grid grid-cols-2 gap-1' : 'flex flex-col gap-1'
                                )}>
                                    <QuickAddItemDialog type="Tag" onSave={onQuickAdd} onOpenChange={setOpen}>
                                        <CommandItem
                                            onSelect={() => {
                                                inputRef.current?.blur();
                                            }}
                                            className="flex items-center gap-2 text-primary cursor-pointer w-full"
                                        >
                                            <PlusCircle className="h-4 w-4" />
                                            Create new tag
                                        </CommandItem>
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
                                    {filteredTags.length === 0 && inputValue.length > 0 && (
                                         <QuickAddItemDialog type="Tag" onSave={onQuickAdd} onOpenChange={setOpen}>
                                            <CommandItem
                                                onSelect={() => {
                                                    inputRef.current?.blur();
                                                }}
                                                className="flex items-center gap-2 text-primary cursor-pointer w-full"
                                            >
                                                <PlusCircle className="h-4 w-4" />
                                                Create new tag "{inputValue}"
                                            </CommandItem>
                                        </QuickAddItemDialog>
                                    )}
                                </CommandGroup>
                            </ScrollArea>
                        </CommandList>
                    </div>
                )}
            </div>
        </Command>
    );
};


function ExpenseForm({
  form,
  onSubmit,
  id,
  accounts,
  categories,
  tags,
  isShared,
}: {
  form: UseFormReturn<any>;
  onSubmit: (e: React.BaseSyntheticEvent) => Promise<void>;
  id: string;
  accounts: Account[];
  categories: Category[];
  tags: Tag[];
  isShared?: boolean;
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
     
    const activeAccounts = useMemo(() => accounts?.filter(acc => acc.status === 'active' || acc.status === undefined) || [], [accounts]);
    const activeCategories = useMemo(() => categories?.filter(c => c.status === 'active' || c.status === undefined) || [], [categories]);
    const activeTags = useMemo(() => tags?.filter(t => t.status === 'active' || t.status === undefined) || [], [tags]);
    
    const isAiSuggestionEnabled = userProfile?.dashboardSettings?.isAiSuggestionEnabled ?? true;

    const renderIcon = (iconName: string | undefined, className?: string) => {
        if (!iconName) return <Pilcrow className={cn("mr-2 h-4 w-4", className)} />;
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className={cn("mr-2 h-4 w-4", className)} /> : <Pilcrow className={cn("mr-2 h-4 w-4", className)} />;
    };


    useEffect(() => {
        const hasInput = debouncedDescription || debouncedCategoryId || (debouncedTagIds && debouncedTagIds.length > 0);
        if (!hasInput || isShared || !isAiSuggestionEnabled || !userProfile?.dashboardSettings?.isAiSuggestionEnabled || activeCategories.length === 0 || activeAccounts.length === 0) {
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

    }, [debouncedDescription, debouncedCategoryId, debouncedTagIds, form, activeCategories, activeTags, activeAccounts, isShared, isAiSuggestionEnabled, userProfile, toast]);


    const handleQuickAdd = async (type: 'Category' | 'Tag', name: string, icon: string): Promise<string | undefined> => {
        if (!user || !firestore) return;
        const collectionName = type === 'Category' ? 'categories' : 'tags';
        const ref = collection(firestore, `users/${user.uid}/${collectionName}`);
        try {
            const newDocRef = doc(ref);
            const docId = newDocRef.id;
            await setDocumentNonBlocking(newDocRef, { id: docId, name, icon, userId: user.uid });
            
            toast({ title: `${type} Added`, description: `"${name}" has been created.` });

            if (type === 'Category') {
                form.setValue('categoryId', docId, { shouldValidate: true });
            } else {
                const currentTagIds = form.getValues('tagIds') || [];
                form.setValue('tagIds', [...currentTagIds, docId], { shouldValidate: true });
            }
            return docId;
        } catch (error: any) {
            toast({ variant: 'destructive', title: `Error Adding ${type}`, description: error.message });
            return undefined;
        }
    };
    
    const isDescriptionRequired = userProfile?.expenseFieldSettings?.isDescriptionRequired ?? false;
    const isTagRequired = userProfile?.expenseFieldSettings?.isTagRequired ?? false;
    const isCategoryRequired = userProfile?.expenseFieldSettings?.isCategoryRequired ?? true;
    
    const fieldOrder = userProfile?.transactionFieldOrder || ['description', 'accountId', 'categoryId', 'tagIds'];
    const visibleFields = userProfile?.expenseFieldSettings?.visibleFields || ['description', 'accountId', 'categoryId', 'tagIds'];

    const formFields: Record<string, React.ReactNode> = {
        description: (
            <FormField
                key="description"
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                         <FloatingLabelInput
                            label={`Description${isDescriptionRequired ? ' *' : ''}`}
                            id="description"
                            {...field}
                            value={field.value ?? ''}
                            className={cn(isSuggesting && 'animate-pulse border-primary/50')}
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />
        ),
        accountId: (
             <FormField
                key="accountId"
                control={form.control}
                name="accountId"
                render={({ field }) => (
                    <FormItem>
                        <FloatingLabelSelect
                            label="Account *"
                            id="accountId"
                            onValueChange={field.onChange}
                            value={field.value}
                        >
                            {activeAccounts?.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>
                                    <div className="flex items-center">
                                        {renderIcon(acc.icon)}
                                        {acc.name}
                                    </div>
                                </SelectItem>
                            ))}
                         </FloatingLabelSelect>
                        <FormMessage />
                    </FormItem>
                )}
            />
        ),
        categoryId: (
            <FormField
                key="categoryId"
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                    <FormItem>
                         <FloatingLabelSelect
                            label={`Category${isCategoryRequired ? ' *' : ''}`}
                            id="categoryId"
                            onValueChange={field.onChange}
                            value={field.value}
                        >
                             <QuickAddItemDialog type="Category" onSave={(name, icon) => handleQuickAdd('Category', name, icon)}>
                                 <div className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent rounded-md text-primary">
                                    <PlusCircle className="h-4 w-4" />
                                    Create new category
                                </div>
                             </QuickAddItemDialog>
                             <SelectItem value="__none__">No Category</SelectItem>
                             {activeCategories?.map(cat => (
                                 <SelectItem key={cat.id} value={cat.id}>
                                     <div className="flex items-center">
                                         {renderIcon(cat.icon)}
                                         {cat.name}
                                     </div>
                                 </SelectItem>
                             ))}
                         </FloatingLabelSelect>
                        <FormMessage />
                    </FormItem>
                )}
            />
        ),
        tagIds: (
            <FormField
                key="tagIds"
                control={form.control}
                name="tagIds"
                render={({ field }) => (
                    <FormItem>
                        <TagCombobox
                            field={field}
                            tags={activeTags}
                            onQuickAdd={(name, icon) => handleQuickAdd('Tag', name, icon)}
                            isRequired={isTagRequired}
                            isSuggesting={isSuggesting}
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />
        )
    }

    return (
        <Form {...form}>
            <form id={id} onSubmit={onSubmit} className="space-y-4">
                {!isShared && (
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
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                 
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
                             <FloatingLabelInput
                                label="Amount *"
                                id="amount"
                                type="number"
                                {...field}
                                value={field.value ?? ''}
                                className={cn(
                                    transactionType === 'expense' && 'text-red-500',
                                    transactionType === 'income' && 'text-green-600'
                                )}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                 {fieldOrder.filter(f => visibleFields.includes(f)).map(fieldName => formFields[fieldName])}
            </form>
        </Form>
    );
}

export function AddExpenseDialog({ 
    children, 
    expenseToEdit,
    sharedExpenseId,
    initialType,
    onSaveSuccess,
}: { 
    children: React.ReactNode, 
    expenseToEdit?: EnrichedExpense,
    sharedExpenseId?: string;
    initialType?: 'income' | 'expense';
    onSaveSuccess?: () => void;
}) {
    const [open, setOpen] = useState(false);
    
    const { form, onFinalSubmit, onSaveAndNewSubmit, handleDelete, isLoading, isEditMode, formId, accounts, categories, tags } = useExpenseForm({
        setOpen, 
        expenseToEdit, 
        sharedExpenseId, 
        initialType,
        open,
        onSaveSuccess,
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="font-headline">{isEditMode ? 'Edit Transaction' : 'Add a New Transaction'}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <ExpenseForm form={form} onSubmit={onFinalSubmit} id={formId} accounts={accounts} categories={categories} tags={tags} isShared={!!sharedExpenseId} />
                </div>
                 <DialogFooter className="flex-row justify-between w-full">
                    <div className="flex items-center">
                        {isEditMode ? (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" variant="destructive" disabled={isLoading}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete this transaction.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : (
                             <DialogClose asChild>
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </DialogClose>
                        )}
                    </div>
                    <div className="flex gap-2 justify-end">
                         {!isEditMode && (
                            <Button type="button" onClick={onSaveAndNewSubmit} disabled={isLoading} variant="outline" className="min-w-[120px]">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save and New
                            </Button>
                         )}
                         <Button type="submit" form={formId} disabled={isLoading} className="min-w-[120px]">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? 'Save Changes' : 'Save'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface UseExpenseFormProps {
    setOpen: (open: boolean) => void;
    expenseToEdit?: EnrichedExpense; 
    sharedExpenseId?: string;
    initialType?: 'income' | 'expense';
    open: boolean;
    onSaveSuccess?: () => void;
}

// Shared hook for form logic
function useExpenseForm({
    setOpen,
    expenseToEdit,
    sharedExpenseId,
    initialType,
    open,
    onSaveSuccess,
}: UseExpenseFormProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const formId = useMemo(() => `expense-form-${Math.random().toString(36).substring(7)}`, []);
    const isEditMode = !!expenseToEdit;

    // Fetch all necessary data here
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    
    const categoriesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/categories`), orderBy('name', 'asc')) : null, [user, firestore]);
    const accountsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/accounts`), orderBy('name', 'asc')) : null, [user, firestore]);
    const tagsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/tags`), orderBy('name', 'asc')) : null, [user, firestore]);

    const { data: categories } = useCollection<Category>(categoriesQuery);
    const { data: accounts } = useCollection<Account>(accountsQuery);
    const { data: tags } = useCollection<Tag>(tagsQuery);
    
    const expenseSchema = useMemo(() => createExpenseSchema(userProfile?.expenseFieldSettings), [userProfile?.expenseFieldSettings]);
    
    // Function to get clean default values
    const getNewFormValues = useCallback((keepDate?: Date, keepAccount?: string) => {
        let type: 'income' | 'expense' = 'expense';
        if (sharedExpenseId) {
            type = 'expense'; // Shared expenses are always expenses
        } else if (initialType) {
            type = initialType;
        }

        return {
            type,
            amount: undefined,
            date: keepDate || new Date(),
            accountId: keepAccount || userProfile?.expenseFieldSettings?.defaultAccountId || '',
            categoryId: '',
            description: '',
            tagIds: [],
        }
    }, [initialType, sharedExpenseId, userProfile]);
    
    const form = useForm<z.infer<typeof expenseSchema>>({
        resolver: zodResolver(expenseSchema),
        defaultValues: getNewFormValues(),
    });
    
    // Effect to reset the form when the dialog opens
    useEffect(() => {
        if (open) {
            if (isEditMode && expenseToEdit) {
                form.reset({
                    type: expenseToEdit.type,
                    amount: expenseToEdit.amount,
                    date: expenseToEdit.date,
                    accountId: expenseToEdit.account?.id || '',
                    categoryId: expenseToEdit.category?.id || '',
                    description: expenseToEdit.description || '',
                    tagIds: expenseToEdit.tags?.map(t => t.id) || [],
                });
            } else {
                 form.reset(getNewFormValues());
            }
        }
    }, [open, isEditMode, expenseToEdit, form, getNewFormValues]);


    const handleTransactionSave = async (values: z.infer<typeof expenseSchema>) => {
        if (!firestore || !user || !categories || !accounts) {
            toast({ variant: 'destructive', title: 'Error', description: 'Required data is not loaded.' });
            return false;
        }
        setIsLoading(true);

        try {
            const batch = writeBatch(firestore);
            const collectionPath = sharedExpenseId ? `shared_expenses/${sharedExpenseId}/expenses` : `users/${user.uid}/expenses`;

            const finalCategoryId = values.categoryId === '__none__' ? undefined : values.categoryId;
            const selectedCategory = categories.find(c => c.id === finalCategoryId);
            const selectedAccount = accounts.find(a => a.id === values.accountId);

            const isCreditLimitUpgrade = selectedCategory?.name === 'Credit Limit Upgrade';
            const isCreditLimitDowngrade = selectedCategory?.name === 'Credit Limit Downgrade';
            const isCreditCardPayment = selectedCategory?.name === 'Credit Card Payment';
            
            if (isCreditCardPayment) {
                // It's a payment TO a credit card, so it's income for the card.
                if (selectedAccount?.type === 'credit_card' && values.type !== 'income') {
                    toast({ variant: 'destructive', title: 'Invalid Operation', description: 'Payments to a credit card must be an "income" transaction for that card.' });
                    setIsLoading(false);
                    return false;
                }
                // It's a payment FROM another account, so it's an expense for that account.
                if (selectedAccount?.type !== 'credit_card' && values.type !== 'expense') {
                     toast({ variant: 'destructive', title: 'Invalid Operation', description: 'Payments from a bank account for a credit card must be an "expense" transaction.' });
                     setIsLoading(false);
                     return false;
                }
            }


            const isAddOperation = !isEditMode;

            // --- Record the transaction itself ---
            const expenseCol = collection(firestore, collectionPath);
            const expenseRef = isAddOperation ? doc(expenseCol) : doc(firestore, collectionPath, expenseToEdit!.id);

            const finalDescription = (values.description || selectedCategory?.name || 'Transaction').trim();

            const expenseData: any = {
                id: expenseRef.id,
                userId: user.uid,
                type: values.type,
                amount: values.amount,
                description: finalDescription,
                date: values.date,
                accountId: values.accountId,
                createdAt: isAddOperation ? serverTimestamp() : expenseToEdit!.createdAt,
                updatedAt: serverTimestamp(),
                tagIds: values.tagIds || [],
                categoryId: finalCategoryId,
            };
            
            if (!expenseData.categoryId) {
                delete expenseData.categoryId;
            }
            
            // This was the bug fix for shared expenses
            if (sharedExpenseId) {
                expenseData.sharedExpenseId = sharedExpenseId;
            }
           
            // Handle special category logic for limit changes
            const handleLimitChange = (
                operation: 'upgrade' | 'downgrade',
                currentValues: typeof values,
                previousExpense?: EnrichedExpense
            ) => {
                const amount = currentValues.amount;
                const type = currentValues.type;
                const expectedType = operation === 'upgrade' ? 'income' : 'expense';
                const increment_or_decrement = operation === 'upgrade' ? amount : -amount;

                if (selectedAccount?.type === 'credit_card' && type === expectedType) {
                    const accountRef = doc(firestore, `users/${user.uid}/accounts`, currentValues.accountId);
                    const updatePayload = { 
                        limit: increment(increment_or_decrement),
                        balance: increment(increment_or_decrement) // Also update available balance
                    };

                    if (!previousExpense) { // New transaction
                        batch.update(accountRef, updatePayload);
                    } else { // Editing transaction
                         const oldCategoryName = categories.find(c => c.id === previousExpense.category?.id)?.name;
                         const oldType = previousExpense.type;
                         const oldAmount = previousExpense.amount;
                         
                         if (oldCategoryName === selectedCategory?.name && oldType === type) {
                            // same category, same type -> adjust by difference
                            const difference = increment_or_decrement - (operation === 'upgrade' ? oldAmount : -oldAmount);
                            batch.update(accountRef, { limit: increment(difference), balance: increment(difference) });
                         } else {
                            // different category or type -> revert old (if applicable), apply new
                            if (oldCategoryName === 'Credit Limit Upgrade' || oldCategoryName === 'Credit Limit Downgrade') {
                                const oldIncrement = oldCategoryName === 'Credit Limit Upgrade' ? oldAmount : -oldAmount;
                                batch.update(accountRef, { limit: increment(-oldIncrement), balance: increment(-oldIncrement) });
                            }
                             batch.update(accountRef, updatePayload);
                         }
                    }
                    return true;
                }
                toast({ variant: 'destructive', title: 'Invalid Operation', description: `"${selectedCategory?.name}" must be an "${expectedType}" transaction for a credit card account.`});
                return false;
            }
            
            if (isCreditLimitUpgrade) {
                if (!handleLimitChange('upgrade', values, expenseToEdit)) {
                     setIsLoading(false);
                     return false;
                }
            }
            if (isCreditLimitDowngrade) {
                if (!handleLimitChange('downgrade', values, expenseToEdit)) {
                    setIsLoading(false);
                    return false;
                }
            }

            // Handle regular balance changes if it's NOT a credit limit change
            if (!sharedExpenseId && !isCreditLimitUpgrade && !isCreditLimitDowngrade) {
                const getAmountChange = (type: 'income' | 'expense', amount: number, accountType: Account['type']) => {
                     // For credit card, balance is available credit. Expenses DECREASE it, payments INCREASE it.
                     if (accountType === 'credit_card') {
                        return type === 'income' ? amount : -amount;
                     }
                     // For other accounts, balance is cash. Income INCREASES it, expenses DECREASE it.
                     return type === 'income' ? amount : -amount;
                };

                if (isAddOperation) {
                     const accountRef = doc(firestore, `users/${user.uid}/accounts`, values.accountId);
                     const amountToUpdate = getAmountChange(values.type, values.amount, selectedAccount!.type);
                     batch.update(accountRef, { balance: increment(amountToUpdate) });
                } else if (expenseToEdit) {
                    const oldAccount = accounts.find(a => a.id === expenseToEdit.account?.id);
                    if (oldAccount) {
                        const oldAccountRef = doc(firestore, `users/${user.uid}/accounts`, expenseToEdit.account!.id);
                        const oldAmountReversal = -getAmountChange(expenseToEdit.type, expenseToEdit.amount, oldAccount.type);
                        batch.update(oldAccountRef, { balance: increment(oldAmountReversal) });
                    }

                    if (selectedAccount) {
                         const newAccountRef = doc(firestore, `users/${user.uid}/accounts`, values.accountId);
                         const newAmount = getAmountChange(values.type, values.amount, selectedAccount.type);
                         batch.update(newAccountRef, { balance: increment(newAmount) });
                    }
                }
            }


            if(isAddOperation) {
                batch.set(expenseRef, expenseData);
            } else {
                batch.update(expenseRef, expenseData);
            }

            commitBatchNonBlocking(batch, collectionPath);

            if (isCreditLimitUpgrade || isCreditLimitDowngrade) {
                toast({ title: `Credit Limit Updated!`, description: `The limit for ${selectedAccount?.name} has been changed.`});
            } else {
                 toast({ title: isEditMode ? 'Transaction Updated!' : 'Transaction Added!', description: `Your ${values.type} has been recorded.` });
            }
            onSaveSuccess?.();
            return true;
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Uh oh! Something went wrong.', description: error.message || 'Could not save transaction.' });
             return false;
        } finally {
            setIsLoading(false);
        }
    }
    
    const resetForm = useCallback((keepDate?: Date, keepAccount?: string) => {
        const newValues = getNewFormValues(keepDate, keepAccount);
        form.reset(newValues);
    }, [form, getNewFormValues]);


    const onFinalSubmit = form.handleSubmit(async (values) => {
        const success = await handleTransactionSave(values);
        if (success) {
            setOpen(false);
        }
    });

    const onSaveAndNewSubmit = form.handleSubmit(async (values) => {
        const success = await handleTransactionSave(values);
        if (success) {
            resetForm(values.date, values.accountId);
        }
    });

    const handleDelete = async () => {
        if (!firestore || !user || !isEditMode || !expenseToEdit || !accounts || !categories) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete transaction.' });
            return;
        }
        setIsLoading(true);
        try {
            const batch = writeBatch(firestore);
            const collectionPath = sharedExpenseId ? `shared_expenses/${sharedExpenseId}/expenses` : `users/${user.uid}/expenses`;
            const expenseRef = doc(firestore, collectionPath, expenseToEdit.id);

            const selectedCategory = categories.find(c => c.id === expenseToEdit.category?.id);
            const isCreditLimitUpgrade = selectedCategory?.name === 'Credit Limit Upgrade';
            const isCreditLimitDowngrade = selectedCategory?.name === 'Credit Limit Downgrade';
            
            batch.delete(expenseRef);

            if (!sharedExpenseId) {
                if (expenseToEdit.account?.id) {
                    const accountRef = doc(firestore, `users/${user.uid}/accounts`, expenseToEdit.account.id);
                    const selectedAccount = accounts.find(acc => acc.id === expenseToEdit.account!.id);
    
                    if ((isCreditLimitUpgrade || isCreditLimitDowngrade) && selectedAccount?.type === 'credit_card') {
                         const amountToRevert = isCreditLimitUpgrade ? -expenseToEdit.amount : expenseToEdit.amount;
                         batch.update(accountRef, { limit: increment(amountToRevert), balance: increment(amountToRevert) });
                    } else {
                        if (selectedAccount) {
                            let amountToRevert: number;
                             if (selectedAccount.type === 'credit_card') {
                                // Reverting a transaction on a CC means doing the opposite of the original
                                // Deleting an expense (purchase) INCREASES available credit
                                // Deleting an income (payment) DECREASES available credit
                                amountToRevert = expenseToEdit.type === 'expense' ? expenseToEdit.amount : -expenseToEdit.amount;
                            } else {
                                 // For regular accounts, it's the standard reversal
                                amountToRevert = expenseToEdit.type === 'income' ? -expenseToEdit.amount : expenseToEdit.amount;
                            }
                            batch.update(accountRef, { balance: increment(amountToRevert) });
                        }
                    }
                }
            }


            commitBatchNonBlocking(batch, collectionPath);
            toast({ title: 'Transaction Deleted', description: 'The transaction has been permanently removed.' });
            onSaveSuccess?.();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };


    return { 
      form, 
      onFinalSubmit, 
      onSaveAndNewSubmit, 
      handleDelete, 
      isLoading, 
      isEditMode, 
      formId,
      accounts: accounts || [],
      categories: categories || [],
      tags: tags || []
    };
}
