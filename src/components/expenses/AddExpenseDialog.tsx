'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerDescription,
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Pilcrow, Trash2, Sparkles, PlusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo, useEffect, useCallback, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch, increment, deleteDoc, addDoc, setDoc } from 'firebase/firestore';
import { UserProfile, Category, Tag, Account, EnrichedExpense } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/currencies';
import * as LucideIcons from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { suggestExpenseDetails } from '@/ai/flows/suggest-expense-details';
import { availableIcons } from '@/lib/defaults';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { generateColorFromString } from '@/lib/utils';


// Function to create a dynamic schema
const createExpenseSchema = (settings?: UserProfile['expenseFieldSettings']) => {
  return z.object({
    type: z.enum(['expense', 'income']).default('expense'),
    date: z.date({ required_error: 'A date is required.' }),
    amount: z.coerce.number().positive({ message: 'Amount must be positive.' }),
    accountId: z.string().min(1, 'Please select an account.'),
    
    categoryId: z.string().optional(),
    
    description: settings?.isDescriptionRequired
      ? z.string().min(1, 'Description is required.')
      : z.string().optional(),

    tagIds: z.array(z.string()).optional(),
  });
};


function DateTimePicker({ field }: { field: any }) {
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateValue = e.target.value;
        field.onChange(new Date(dateValue));
    };

    const formatForInput = (date: Date): string => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    return (
        <FormControl>
            <Input
                type="datetime-local"
                className="w-full"
                value={formatForInput(field.value)}
                onChange={handleDateChange}
            />
        </FormControl>
    );
}


function QuickAddItemDialog({
    type,
    onSave,
    children
}: {
    type: 'Category' | 'Tag';
    onSave: (name: string, icon: string) => Promise<string | undefined>;
    children: React.ReactNode;
}) {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState(type === 'Category' ? 'Shapes' : 'Tag');
    const [isSaving, setIsSaving] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const renderIcon = (iconName: string, className?: string) => {
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className={cn("h-5 w-5", className)} /> : <Pilcrow className={cn("h-5 w-5", className)} />;
    };

    const handleSave = async () => {
        if (!name) return;
        setIsSaving(true);
        await onSave(name, icon);
        setIsSaving(false);
        setIsOpen(false);
        setName('');
        setIcon(type === 'Category' ? 'Shapes' : 'Tag');
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New {type}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={`${type} name`}
                            autoFocus
                        />
                    </div>
                     <div className="space-y-2">
                        <Label>Icon</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start">
                                    {renderIcon(icon)}
                                    <span className="ml-2">{icon}</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto grid grid-cols-5 gap-2 max-h-60 overflow-y-auto">
                                {availableIcons.map(iconName => (
                                    <Button key={iconName} variant="ghost" size="icon" onClick={() => setIcon(iconName)}>
                                        {renderIcon(iconName)}
                                    </Button>
                                ))}
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
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
  tags
}: {
  form: UseFormReturn<any>;
  onSubmit: (e: React.BaseSyntheticEvent) => Promise<void>;
  id: string;
  accounts: Account[];
  categories: Category[];
  tags: Tag[];
}) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const transactionType = form.watch('type');

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
     
    const activeAccounts = useMemo(() => accounts?.filter(acc => acc.status === 'active' || acc.status === undefined) || [], [accounts]);
    
    const [isSuggesting, startSuggestionTransition] = useTransition();

    const handleSuggestion = useCallback(() => {
        const currentDescription = form.getValues('description');
        if (!currentDescription || categories.length === 0 || accounts.length === 0 || tags.length === 0) return;
        
        startSuggestionTransition(async () => {
            try {
                const suggestions = await suggestExpenseDetails({
                    description: currentDescription,
                    categories: categories.map(({ id, name }) => ({ id, name })),
                    tags: tags.map(({ id, name }) => ({ id, name })),
                    accounts: activeAccounts.map(({ id, name }) => ({ id, name })),
                });
                
                if (suggestions.categoryId) form.setValue('categoryId', suggestions.categoryId, { shouldValidate: true });
                if (suggestions.accountId) form.setValue('accountId', suggestions.accountId, { shouldValidate: true });
                if (suggestions.tagIds) form.setValue('tagIds', suggestions.tagIds, { shouldValidate: true });
                if (suggestions.description && suggestions.description !== currentDescription) {
                    form.setValue('description', suggestions.description, { shouldValidate: true });
                }

            } catch (error) {
                console.error("AI suggestion failed:", error);
            }
        });
    }, [form, categories, tags, activeAccounts]);

    const handleQuickAdd = async (type: 'Category' | 'Tag', name: string, icon: string): Promise<string | undefined> => {
        if (!user || !firestore) return;
        const collectionName = type === 'Category' ? 'categories' : 'tags';
        const ref = collection(firestore, `users/${user.uid}/${collectionName}`);
        try {
            const newDocRef = doc(ref);
            await setDoc(newDocRef, { id: newDocRef.id, name, icon, userId: user.uid });
            
            toast({ title: `${type} Added`, description: `"${name}" has been created.` });

            if (type === 'Category') {
                form.setValue('categoryId', newDocRef.id, { shouldValidate: true });
            } else {
                const currentTagIds = form.getValues('tagIds') || [];
                form.setValue('tagIds', [...currentTagIds, newDocRef.id], { shouldValidate: true });
            }
            return newDocRef.id;
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

    const selectedTags = useMemo(() => {
        return selectedTagIds.map(id => tags.find(t => t.id === id)).filter(Boolean) as Tag[];
    }, [selectedTagIds, tags]);


    return (
        <Form {...form}>
            <form id={id} onSubmit={onSubmit} className="grid items-start gap-4">
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Transaction Type</FormLabel>
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
                 <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                         <FormItem className="flex flex-col space-y-2">
                            <FormLabel>Date & Time</FormLabel>
                            <DateTimePicker field={field} />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                           <Input type="number" placeholder="Enter amount" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                
                <FormField
                    control={form.control}
                    name="accountId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an account" />
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
                
                 <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Category {isCategoryRequired && transactionType === 'expense' ? '' : '(Optional)'}
                            </FormLabel>
                            <div className="flex gap-2">
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl>
                                    <SelectTrigger className="w-full">
                                        {field.value && field.value !== 'no-category' ? (
                                            <div className="flex items-center">
                                                {renderIcon(categories.find(c => c.id === field.value)?.icon)}
                                                {categories.find(c => c.id === field.value)?.name || "Select a category"}
                                            </div>
                                        ) : <SelectValue placeholder="Select a category" />}
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {(!isCategoryRequired || transactionType === 'income') && <SelectItem value="no-category">No Category</SelectItem>}
                                        {categories?.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                <div className="flex items-center">
                                                    {renderIcon(cat.icon)}
                                                    {cat.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <QuickAddItemDialog type="Category" onSave={(name, icon) => handleQuickAdd('Category', name, icon)}>
                                    <Button variant="outline" size="icon" type="button"><PlusCircle className="h-4 w-4" /></Button>
                                </QuickAddItemDialog>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="tagIds"
                    render={({ field }) => (
                         <FormItem>
                            <FormLabel>
                                Tags {isTagRequired ? '' : '(Optional)'}
                            </FormLabel>
                            <div className="flex gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start font-normal">
                                            Select tags...
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]" align="start">
                                        {tags.map(tag => (
                                            <DropdownMenuCheckboxItem
                                                key={tag.id}
                                                checked={field.value?.includes(tag.id)}
                                                onCheckedChange={(checked) => {
                                                    const newValue = checked
                                                        ? [...(field.value || []), tag.id]
                                                        : (field.value || []).filter(id => id !== tag.id);
                                                    field.onChange(newValue);
                                                }}
                                                onSelect={(e) => e.preventDefault()}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {renderIcon(tag.icon)}
                                                    <span>{tag.name}</span>
                                                </div>
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <QuickAddItemDialog type="Tag" onSave={(name, icon) => handleQuickAdd('Tag', name, icon)}>
                                   <Button variant="outline" size="icon" type="button"><PlusCircle className="h-4 w-4" /></Button>
                                </QuickAddItemDialog>
                            </div>
                            <FormMessage />
                            {selectedTags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-2">
                                    {selectedTags.map(tag => {
                                        const color = generateColorFromString(tag.name);
                                        return (
                                            <Badge
                                                key={tag.id}
                                                style={{ backgroundColor: color.backgroundColor, color: color.textColor }}
                                                className="flex items-center gap-1 border-transparent"
                                            >
                                                {renderIcon(tag.icon, "h-3 w-3")}
                                                {tag.name}
                                            </Badge>
                                        )
                                    })}
                                </div>
                            )}
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex justify-between items-center">
                                <FormLabel>
                                    Description {isDescriptionRequired ? '' : '(Optional)'}
                                </FormLabel>
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={handleSuggestion} disabled={isSuggesting}>
                                    {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-500" />}
                                    <span className="sr-only">Get Suggestions</span>
                                </Button>
                            </div>
                        <FormControl>
                            <Input placeholder={transactionType === 'expense' ? 'e.g., Groceries from Walmart' : 'e.g., Monthly Salary'} {...field} value={field.value ?? ''}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </form>
        </Form>
    );
}

export function AddExpenseDialog({ 
    children, 
    expenseToEdit,
    sharedExpenseId,
    initialType,
}: { 
    children: React.ReactNode, 
    expenseToEdit?: EnrichedExpense,
    sharedExpenseId?: string;
    initialType?: 'income' | 'expense';
}) {
    const [open, setOpen] = useState(false);
    const isDesktop = useMediaQuery("(min-width: 768px)");

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
    }
    
    if (isDesktop) {
        return (
            <DesktopAddExpenseDialog open={open} setOpen={handleOpenChange} expenseToEdit={expenseToEdit} sharedExpenseId={sharedExpenseId} initialType={initialType}>
                {children}
            </DesktopAddExpenseDialog>
        );
    }

    return (
        <MobileAddExpenseDrawer open={open} setOpen={handleOpenChange} expenseToEdit={expenseToEdit} sharedExpenseId={sharedExpenseId} initialType={initialType}>
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
}: { 
    children: React.ReactNode, 
    open: boolean, 
    setOpen: (open: boolean) => void,
    expenseToEdit?: EnrichedExpense,
    sharedExpenseId?: string,
    initialType?: 'income' | 'expense';
}) {
    const { form, onFinalSubmit, onSaveAndNewSubmit, handleDelete, isLoading, isEditMode, formId, accounts, categories, tags } = useExpenseForm({
        setOpen, 
        expenseToEdit, 
        sharedExpenseId, 
        initialType,
        open
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="font-headline">{isEditMode ? 'Edit Transaction' : 'Add a New Transaction'}</DialogTitle>
                    <DialogDescription>{isEditMode ? 'Update the details of your transaction.' : 'Fill in the details of your income or expense below.'}</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <ExpenseForm form={form} onSubmit={onFinalSubmit} id={formId} accounts={accounts} categories={categories} tags={tags} />
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
}: { 
    children: React.ReactNode, 
    open: boolean, 
    setOpen: (open: boolean) => void,
    expenseToEdit?: EnrichedExpense,
    sharedExpenseId?: string;
    initialType?: 'income' | 'expense';
}) {
    const { form, onFinalSubmit, onSaveAndNewSubmit, handleDelete, isLoading, isEditMode, formId, accounts, categories, tags } = useExpenseForm({
        setOpen,
        expenseToEdit,
        sharedExpenseId,
        initialType,
        open
    });
    
    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>{children}</DrawerTrigger>
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle>{isEditMode ? 'Edit Transaction' : 'Add a New Transaction'}</DrawerTitle>
                    <DrawerDescription>{isEditMode ? 'Update the details of your transaction.' : 'Fill in the details of your income or expense below.'}</DrawerDescription>
                </DrawerHeader>
                 <div className="overflow-y-auto px-4">
                    <ExpenseForm form={form} onSubmit={onFinalSubmit} id={formId} accounts={accounts} categories={categories} tags={tags}/>
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
}

// Shared hook for form logic
function useExpenseForm({
    setOpen,
    expenseToEdit,
    sharedExpenseId,
    initialType,
    open
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
    const categoriesQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/categories`) : null, [user, firestore]);
    const accountsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/accounts`) : null, [user, firestore]);
    const tagsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/tags`) : null, [user, firestore]);

    const { data: categories } = useCollection<Category>(categoriesQuery);
    const { data: accounts } = useCollection<Account>(accountsQuery);
    const { data: tags } = useCollection<Tag>(tagsQuery);
    
    const expenseSchema = useMemo(() => createExpenseSchema(userProfile?.expenseFieldSettings), [userProfile?.expenseFieldSettings]);
    
    // Function to get clean default values
    const getNewFormValues = useCallback(() => {
        return {
            type: initialType || 'expense',
            amount: '' as any,
            date: new Date(),
            accountId: '',
            categoryId: 'no-category',
            description: '',
            tagIds: [],
        }
    }, [initialType]);
    
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
                    categoryId: expenseToEdit.category?.id || 'no-category',
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
            const isCreditLimitUpgrade = selectedCategory?.name === 'Credit Limit Upgrade';
            const selectedAccount = accounts.find(a => a.id === values.accountId);

            const isAddOperation = !isEditMode;

            // --- Record the transaction itself ---
            const expenseCol = collection(firestore, collectionPath);
            const expenseRef = isAddOperation ? doc(expenseCol) : doc(firestore, collectionPath, expenseToEdit.id);

            const expenseData: any = {
                ...values,
                id: expenseRef.id,
                userId: user.uid,
                createdAt: isAddOperation ? serverTimestamp() : expenseToEdit.createdAt,
                updatedAt: serverTimestamp(),
                tagIds: values.tagIds || [],
                categoryId: values.categoryId === 'no-category' ? null : values.categoryId,
            };

            // Only add sharedExpenseId if it exists to avoid Firestore error
            if (sharedExpenseId) {
                expenseData.sharedExpenseId = sharedExpenseId;
            } else {
                delete expenseData.sharedExpenseId;
            }

            // Logic for "Credit Limit Upgrade"
            if (isCreditLimitUpgrade) {
                if (selectedAccount?.type === 'credit_card') {
                    const accountRef = doc(firestore, `users/${user.uid}/accounts`, values.accountId);
                    
                    if (isAddOperation) {
                        batch.update(accountRef, { limit: increment(values.amount) });
                    } else if (expenseToEdit) {
                        const oldAmount = expenseToEdit.amount;
                        const difference = values.amount - oldAmount;
                        batch.update(accountRef, { limit: increment(difference) });
                    }
                } else {
                     toast({ variant: 'destructive', title: 'Invalid Account', description: 'Credit Limit Upgrade can only be applied to credit card accounts.'});
                     setIsLoading(false);
                     return false;
                }
            }
            
            // --- Adjust Account Balance (skip for shared expenses and credit limit upgrades) ---
            if (!sharedExpenseId && !isCreditLimitUpgrade) {
                const getAmountChange = (type: 'income' | 'expense', amount: number, accountType: Account['type']) => {
                     if (accountType === 'credit_card') {
                        // For credit cards, 'expense' increases balance (debt), 'income' (payment) decreases it.
                        return type === 'expense' ? amount : -amount;
                     }
                     // For other accounts, 'income' increases balance, 'expense' decreases it.
                     return type === 'income' ? amount : -amount;
                };

                if (isAddOperation) {
                     const accountRef = doc(firestore, `users/${user.uid}/accounts`, values.accountId);
                     const amountToUpdate = getAmountChange(values.type, values.amount, selectedAccount!.type);
                     batch.update(accountRef, { balance: increment(amountToUpdate) });
                } else if (expenseToEdit) {
                    const oldAccount = accounts.find(a => a.id === expenseToEdit.accountId);
                    if (oldAccount) {
                        const oldAccountRef = doc(firestore, `users/${user.uid}/accounts`, expenseToEdit.accountId);
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

            await batch.commit();

            if (isCreditLimitUpgrade) {
                toast({ title: 'Credit Limit Updated!', description: `The limit for ${selectedAccount?.name} has been increased.` });
            } else {
                 toast({ title: isEditMode ? 'Transaction Updated!' : 'Transaction Added!', description: `Your ${values.type} has been recorded.` });
            }
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

            const selectedCategory = categories.find(c => c.id === expenseToEdit.categoryId);
            const isCreditLimitUpgrade = selectedCategory?.name === 'Credit Limit Upgrade';
            
            batch.delete(expenseRef);

            if (!sharedExpenseId) {
                const accountRef = doc(firestore, `users/${user.uid}/accounts`, expenseToEdit.accountId);
                const selectedAccount = accounts.find(acc => acc.id === expenseToEdit.accountId);

                if (isCreditLimitUpgrade) {
                     batch.update(accountRef, { limit: increment(-expenseToEdit.amount) });
                } else {
                    if (selectedAccount) {
                        let amountToRevert: number;
                        if (selectedAccount.type === 'credit_card') {
                            amountToRevert = expenseToEdit.type === 'expense' ? -expenseToEdit.amount : expenseToEdit.amount;
                        } else {
                            amountToRevert = expenseToEdit.type === 'income' ? -expenseToEdit.amount : expenseToEdit.amount;
                        }
                        batch.update(accountRef, { balance: increment(amountToRevert) });
                    }
                }
            }


            await batch.commit();
            toast({ title: 'Transaction Deleted', description: 'The transaction has been permanently removed.' });
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

    

    