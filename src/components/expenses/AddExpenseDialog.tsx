
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
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
import { Loader2, Pilcrow, Trash2, Sparkles, PlusCircle, X, Check, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Badge } from '../ui/badge';
import { generateColorStyle } from '@/lib/utils';
import { useDebounce } from 'use-debounce';
import { ScrollArea } from '../ui/scroll-area';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';

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

// New FloatingLabelInput component
const FloatingLabelInput = React.forwardRef<HTMLInputElement, InputProps & { label: string, rightIcon?: React.ReactNode }>(
    ({ className, label, id, rightIcon, ...props }, ref) => {
        const hasValue = props.value && String(props.value) !== '';
        return (
            <div className="relative">
                <Input
                    ref={ref}
                    id={id}
                    placeholder=" "
                    className={cn("peer h-14 pt-4 text-base", rightIcon ? "pr-10" : "", className)}
                    {...props}
                />
                <Label
                    htmlFor={id}
                    className={cn(
                        "absolute left-3 text-xs text-muted-foreground transition-all bg-transparent px-1 pointer-events-none top-1",
                         "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base",
                        "peer-focus:top-1 peer-focus:-translate-y-0 peer-focus:text-xs",
                         (hasValue || props.type === 'date' || props.type === 'time') && "top-1 -translate-y-0 text-xs"
                    )}
                >
                    {label}
                </Label>
                {rightIcon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {rightIcon}
                    </div>
                )}
            </div>
        );
    }
);
FloatingLabelInput.displayName = 'FloatingLabelInput';

const FloatingLabelSelect = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof SelectTrigger> & { label: string; children: React.ReactNode; onValueChange: (value: string) => void; value?: string }>(
    ({ className, label, id, children, onValueChange, value, ...props }, ref) => {
        const hasValue = value && value !== '';
        return (
            <div className="relative">
                 <Select onValueChange={onValueChange} value={value}>
                    <SelectTrigger ref={ref} id={id} className={cn("peer h-14 pt-4 text-base", className)} {...props}>
                        <SelectValue placeholder=" "/>
                    </SelectTrigger>
                    <SelectContent>
                        {children}
                    </SelectContent>
                </Select>
                 <Label
                    htmlFor={id}
                    className={cn(
                        "absolute left-3 text-xs text-muted-foreground transition-all bg-background px-1 pointer-events-none top-0 -translate-y-1/2",
                         hasValue ? "top-0 -translate-y-1/2" : "top-1/2 -translate-y-1/2 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs",
                         "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base"
                    )}
                >
                    {label}
                </Label>
            </div>
        )
    }
);
FloatingLabelSelect.displayName = 'FloatingLabelSelect';

// Component for quick adding of Categories or Tags
interface QuickAddItemDialogProps {
    type: 'Category' | 'Tag';
    onSave: (name: string, icon: string) => Promise<string | undefined>;
    children: React.ReactNode;
}

function QuickAddItemDialog({ type, onSave, children }: QuickAddItemDialogProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [icon, setIcon] = useState(type === 'Category' ? 'Shapes' : 'Tag');
    const [isSaving, setIsSaving] = useState(false);

    const renderIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="h-5 w-5" /> : <Pilcrow className="h-5 w-5" />;
    };

    const handleSave = async () => {
        if (!name) return;
        setIsSaving(true);
        const newId = await onSave(name, icon);
        if (newId) {
            setOpen(false);
            setName('');
            setIcon(type === 'Category' ? 'Shapes' : 'Tag');
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
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
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                                {renderIcon(icon)}
                                <span className="ml-2">{icon}</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto grid grid-cols-5 gap-2">
                            {availableIcons.map(iconName => (
                                <Button key={iconName} variant="ghost" size="icon" onClick={() => setIcon(iconName)}>
                                    {renderIcon(iconName)}
                                </Button>
                            ))}
                        </PopoverContent>
                    </Popover>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !name}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

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
    
    const [debouncedDescription] = useDebounce(descriptionValue, 500);
    const [isSuggesting, startSuggestionTransition] = useTransition();

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
     
    const activeAccounts = useMemo(() => accounts?.filter(acc => acc.status === 'active' || acc.status === undefined) || [], [accounts]);
    
    const isAiSuggestionEnabled = userProfile?.dashboardSettings?.isAiSuggestionEnabled ?? true;


    useEffect(() => {
        if (!debouncedDescription || isShared || !isAiSuggestionEnabled || categories.length === 0 || accounts.length === 0 || tags.length === 0) {
            return;
        }

        startSuggestionTransition(async () => {
            try {
                const suggestions = await suggestExpenseDetails({
                    description: debouncedDescription,
                    categories: categories.map(({ id, name }) => ({ id, name })),
                    tags: tags.map(({ id, name }) => ({ id, name })),
                    accounts: activeAccounts.map(({ id, name }) => ({ id, name })),
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

    }, [debouncedDescription, form, categories, tags, activeAccounts, isShared, isAiSuggestionEnabled]);


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

    const renderIcon = (iconName: string | undefined, className?: string) => {
        if (!iconName) return <Pilcrow className={cn("mr-2 h-4 w-4", className)} />;
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className={cn("mr-2 h-4 w-4", className)} /> : <Pilcrow className={cn("mr-2 h-4 w-4", className)} />;
    };

    const isDescriptionRequired = userProfile?.expenseFieldSettings?.isDescriptionRequired ?? false;
    const isTagRequired = userProfile?.expenseFieldSettings?.isTagRequired ?? false;
    const isCategoryRequired = userProfile?.expenseFieldSettings?.isCategoryRequired ?? true;
    
    const selectedTagIds = form.watch('tagIds') || [];

    const fieldOrder = userProfile?.transactionFieldOrder || ['description', 'accountId', 'categoryId', 'tagIds'];

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
                            label={`Category${isCategoryRequired && transactionType === 'expense' ? ' *' : ''}`}
                            id="categoryId"
                            onValueChange={(value) => field.onChange(value === 'no-category' ? '' : value)}
                            value={field.value || 'no-category'}
                        >
                             {(!isCategoryRequired || transactionType === 'income') && <SelectItem value="no-category">No Category</SelectItem>}
                             {categories?.map(cat => (
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
                render={({ field }) => {
                    const [open, setOpen] = useState(false);
                    const [inputValue, setInputValue] = useState("");

                    const handleSelect = (tagId: string) => {
                        const currentTags = field.value || [];
                        const isSelected = currentTags.includes(tagId);
                        field.onChange(
                            isSelected 
                                ? currentTags.filter(id => id !== tagId) 
                                : [...currentTags, tagId]
                        );
                        setInputValue("");
                    };

                    const filteredTags = tags.filter(tag => 
                        !selectedTagIds.includes(tag.id) &&
                        tag.name.toLowerCase().includes(inputValue.toLowerCase())
                    );
                    
                    const selectedTagObjects = selectedTagIds.map(id => tags.find(t => t.id === id)).filter(Boolean) as Tag[];

                    return (
                        <FormItem>
                            <div className="space-y-2">
                                <Label>Tags {isTagRequired && <span className="text-destructive">*</span>}</Label>
                                {selectedTagIds.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 py-2">
                                    {selectedTagObjects.map(tag => (
                                        <Badge
                                            key={tag.id}
                                            style={generateColorStyle(tag.name)}
                                            className="badge-colorful flex items-center gap-1"
                                        >
                                            {renderIcon(tag.icon, "h-3 w-3")}
                                            {tag.name}
                                            <button
                                                type="button"
                                                className="focus:outline-none"
                                                onClick={(e) => { e.stopPropagation(); handleSelect(tag.id); }}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                    </div>
                                )}
                            </div>
                           <Popover open={open} onOpenChange={setOpen}>
                                <div className="flex gap-2">
                                <PopoverTrigger asChild>
                                    <Command>
                                        <CommandInput
                                            placeholder="Search tags..."
                                            value={inputValue}
                                            onValueChange={setInputValue}
                                            onFocus={() => setOpen(true)}
                                        />
                                    </Command>
                                </PopoverTrigger>
                                 <QuickAddItemDialog type="Tag" onSave={(name, icon) => handleQuickAdd('Tag', name, icon)}>
                                    <Button variant="outline" size="icon" type="button"><PlusCircle className="h-4 w-4" /></Button>
                                </QuickAddItemDialog>
                                </div>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command>
                                      <CommandList>
                                        <ScrollArea className="h-48">
                                            <CommandGroup>
                                                <div className="grid grid-cols-2 gap-1 p-1">
                                                    {filteredTags.map(tag => (
                                                        <CommandItem
                                                            key={tag.id}
                                                            value={tag.name}
                                                            onSelect={() => handleSelect(tag.id)}
                                                            className="flex items-center justify-between gap-2"
                                                        >
                                                            <div className="flex items-center gap-2 truncate">
                                                                {renderIcon(tag.icon)}
                                                                <span className="truncate">{tag.name}</span>
                                                            </div>
                                                            <Check className={cn("h-4 w-4", selectedTagIds.includes(tag.id) ? "opacity-100" : "opacity-0")} />
                                                        </CommandItem>
                                                    ))}
                                                </div>
                                            </CommandGroup>
                                        </ScrollArea>
                                      </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )
                }}
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
                                        <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground", field.value === 'expense' ? "border-destructive text-destructive" : "border-muted")}>
                                            <RadioGroupItem value="expense" className="sr-only" />
                                            <span>Cash Out</span>
                                        </Label>
                                    </FormItem>
                                     <FormItem>
                                        <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground", field.value === 'income' ? "border-green-600 text-green-600" : "border-muted")}>
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
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                         <FormItem className="grid grid-cols-2 gap-2 pt-2">
                             <Popover>
                                <PopoverTrigger asChild>
                                     <button type="button" className="w-full">
                                         <FloatingLabelInput
                                            label="Date"
                                            id="date"
                                            readOnly
                                            value={format(field.value, "PPP")}
                                            rightIcon={<CalendarIcon className="h-5 w-5"/>}
                                        />
                                     </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                                </PopoverContent>
                            </Popover>
                            <FloatingLabelInput
                                label="Time"
                                id="time"
                                type="time"
                                value={format(field.value, "HH:mm")}
                                onChange={(e) => {
                                    const [hours, minutes] = e.target.value.split(':').map(Number);
                                    const newDate = new Date(field.value);
                                    newDate.setHours(hours);
                                    newDate.setMinutes(minutes);
                                    field.onChange(newDate);
                                }}
                                rightIcon={<Clock className="h-5 w-5"/>}
                            />
                            <FormMessage className="col-span-2" />
                        </FormItem>
                    )}
                />
                
                 {fieldOrder.map(fieldName => formFields[fieldName])}
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
    const isDesktop = useMediaQuery("(min-width: 768px)");

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
    }
    
    if (isDesktop) {
        return (
            <DesktopAddExpenseDialog open={open} setOpen={handleOpenChange} expenseToEdit={expenseToEdit} sharedExpenseId={sharedExpenseId} initialType={initialType} onSaveSuccess={onSaveSuccess}>
                {children}
            </DesktopAddExpenseDialog>
        );
    }

    return (
        <MobileAddExpenseDrawer open={open} setOpen={handleOpenChange} expenseToEdit={expenseToEdit} sharedExpenseId={sharedExpenseId} initialType={initialType} onSaveSuccess={onSaveSuccess}>
            {children}
        </MobileAddExpenseDrawer>
    );
}


function DesktopAddExpenseDialog({ 
    children, 
    open, 
    setOpen,
    expenseToEdit,
    sharedExpenseId,
    initialType,
    onSaveSuccess,
}: { 
    children: React.ReactNode, 
    open: boolean, 
    setOpen: (open: boolean) => void,
    expenseToEdit?: EnrichedExpense,
    sharedExpenseId?: string,
    initialType?: 'income' | 'expense',
    onSaveSuccess?: () => void;
}) {
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
                    <div>
                        {isEditMode && (
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
                        )}
                    </div>
                    <div className="flex gap-2 justify-end">
                         {!isEditMode && (
                             <Button type="button" onClick={onSaveAndNewSubmit} disabled={isLoading} variant="outline">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save and New
                            </Button>
                         )}
                         <Button type="submit" form={formId} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? 'Save Changes' : 'Save'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function MobileAddExpenseDrawer({ 
    children, 
    open, 
    setOpen,
    expenseToEdit,
    sharedExpenseId,
    initialType,
    onSaveSuccess,
}: { 
    children: React.ReactNode, 
    open: boolean, 
    setOpen: (open: boolean) => void,
    expenseToEdit?: EnrichedExpense,
    sharedExpenseId?: string;
    initialType?: 'income' | 'expense';
    onSaveSuccess?: () => void;
}) {
    const { form, onFinalSubmit, onSaveAndNewSubmit, handleDelete, isLoading, isEditMode, formId, accounts, categories, tags } = useExpenseForm({
        setOpen,
        expenseToEdit,
        sharedExpenseId,
        initialType,
        open,
        onSaveSuccess,
    });
    
    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>{children}</DrawerTrigger>
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle>{isEditMode ? 'Edit Transaction' : 'Add a New Transaction'}</DrawerTitle>
                </DrawerHeader>
                 <div className="overflow-y-auto px-4">
                    <ExpenseForm form={form} onSubmit={onFinalSubmit} id={formId} accounts={accounts} categories={categories} tags={tags} isShared={!!sharedExpenseId}/>
                </div>
                 <DrawerFooter className="pt-2">
                    <div className="flex w-full gap-2">
                        {!isEditMode && (
                             <Button variant="outline" className="flex-1" onClick={onSaveAndNewSubmit} disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save and New
                            </Button>
                        )}
                        <Button type="submit" form={formId} className="flex-1" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? 'Save' : 'Save'}
                        </Button>
                    </div>
                     {isEditMode && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button type="button" variant="destructive" className="w-full" disabled={isLoading}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Transaction
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
                    )}
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
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
    const getNewFormValues = useCallback(() => {
        let type: 'income' | 'expense' = 'expense';
        if (sharedExpenseId) {
            type = 'expense'; // Shared expenses are always expenses
        } else if (initialType) {
            type = initialType;
        }

        return {
            type,
            amount: '' as any,
            date: new Date(),
            accountId: '',
            categoryId: '',
            description: '',
            tagIds: [],
        }
    }, [initialType, sharedExpenseId]);
    
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

            const selectedCategory = categories.find(c => c.id === values.categoryId);
            const selectedAccount = accounts.find(a => a.id === values.accountId);

            const isCreditLimitUpgrade = selectedCategory?.name === 'Credit Limit Upgrade';
            const isCreditCardPayment = selectedCategory?.name === 'Credit Card Payment';
            
            if (isCreditCardPayment) {
                if (selectedAccount?.type !== 'credit_card' || values.type !== 'income') {
                    toast({ variant: 'destructive', title: 'Invalid Operation', description: '"Credit Card Payment" must be an "income" transaction to a credit card account.'});
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
                ...values,
                id: expenseRef.id,
                userId: user.uid,
                description: finalDescription,
                createdAt: isAddOperation ? serverTimestamp() : expenseToEdit!.createdAt,
                updatedAt: serverTimestamp(),
                tagIds: values.tagIds || [],
                categoryId: values.categoryId === 'no-category' ? null : values.categoryId,
            };
            
            delete expenseData.sharedExpenseId;
           
            // Handle special category logic
            if (isCreditLimitUpgrade) {
                 if (selectedAccount?.type === 'credit_card' && values.type === 'income') {
                    const accountRef = doc(firestore, `users/${user.uid}/accounts`, values.accountId);
                    if (isAddOperation) {
                        batch.update(accountRef, { limit: increment(values.amount) });
                    } else if (expenseToEdit) {
                        // On edit, calculate the difference from the old amount to the new amount.
                        // Only adjust if the category was also "Credit Limit Upgrade" previously.
                        const oldCategory = categories.find(c => c.id === expenseToEdit.category?.id);
                        if (oldCategory?.name === 'Credit Limit Upgrade' && expenseToEdit.type === 'income') {
                           const difference = values.amount - expenseToEdit.amount;
                           batch.update(accountRef, { limit: increment(difference) });
                        } else {
                            // If category changed TO limit upgrade, just increment by new amount
                           batch.update(accountRef, { limit: increment(values.amount) });
                        }
                    }
                } else {
                     toast({ variant: 'destructive', title: 'Invalid Operation', description: 'Credit Limit Upgrade must be an "income" transaction for a credit card account.'});
                     setIsLoading(false);
                     return false;
                }
            }
            
            // Handle regular balance changes if it's NOT a credit limit upgrade
            if (!sharedExpenseId && !isCreditLimitUpgrade) {
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

            if (isCreditLimitUpgrade) {
                toast({ title: 'Credit Limit Updated!', description: `The limit for ${selectedAccount?.name} has been increased.`});
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
    
    const resetForm = useCallback(() => {
        form.reset(getNewFormValues());
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
            resetForm();
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
            
            batch.delete(expenseRef);

            if (!sharedExpenseId) {
                if (expenseToEdit.account?.id) {
                    const accountRef = doc(firestore, `users/${user.uid}/accounts`, expenseToEdit.account.id);
                    const selectedAccount = accounts.find(acc => acc.id === expenseToEdit.account!.id);
    
                    if (isCreditLimitUpgrade && selectedAccount?.type === 'credit_card' && expenseToEdit.type === 'income') {
                         batch.update(accountRef, { limit: increment(-expenseToEdit.amount) });
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
