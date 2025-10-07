
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

import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Pilcrow, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch, increment, deleteDoc } from 'firebase/firestore';
import { UserProfile, Category, Tag, Account, EnrichedExpense } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/currencies';
import * as LucideIcons from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';

// Function to create a dynamic schema
const createExpenseSchema = (settings?: UserProfile['expenseFieldSettings']) => {
  return z.object({
    type: z.enum(['expense', 'income']).default('expense'),
    date: z.date({ required_error: 'A date is required.' }),
    amount: z.coerce.number().positive({ message: 'Amount must be positive.' }),
    accountId: z.string().min(1, 'Please select an account.'),
    
    categoryId: settings?.isCategoryRequired
      ? z.string().min(1, 'Please select a category.')
      : z.string().optional(),
    
    description: settings?.isDescriptionRequired
      ? z.string().min(1, 'Description is required.')
      : z.string().optional(),

    tagId: settings?.isTagRequired
      ? z.string().min(1, 'Please select a tag.')
      : z.string().optional(),
  });
};


function DateTimePicker({ field }: { field: any }) {
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateValue = e.target.value;
        // The input gives a string, so we convert it to a Date object
        field.onChange(new Date(dateValue));
    };

    // Format the date from the form state into 'YYYY-MM-DDTHH:mm' for the input
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

function ExpenseForm({
  form,
  onSubmit,
  id,
  transactionType,
  accounts,
  categories,
  tags
}: {
  form: UseFormReturn<any>;
  onSubmit: (e: React.BaseSyntheticEvent) => Promise<void>;
  id: string;
  transactionType: 'expense' | 'income';
  accounts: Account[];
  categories: Category[];
  tags: Tag[];
}) {
    const { user } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
     
    const activeAccounts = useMemo(() => accounts?.filter(acc => acc.status === 'active' || acc.status === undefined) || [], [accounts]);
    
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    const renderIcon = (iconName: string | undefined) => {
        if (!iconName) return <Pilcrow className="mr-2 h-4 w-4" />;
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="mr-2 h-4 w-4" /> : <Pilcrow className="mr-2 h-4 w-4" />;
    };

    // Determine if fields are required for UI cues
    const isDescriptionRequired = userProfile?.expenseFieldSettings?.isDescriptionRequired ?? false;
    const isTagRequired = userProfile?.expenseFieldSettings?.isTagRequired ?? false;
    const isCategoryRequired = userProfile?.expenseFieldSettings?.isCategoryRequired ?? true;

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
                         <FormItem className="flex flex-row items-center justify-between">
                            <FormLabel>Date & Time</FormLabel>
                            <div className="w-[240px]">
                                <DateTimePicker field={field} />
                            </div>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Select onValueChange={field.onChange} value={field.value || 'no-category'}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
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
                        <FormMessage />
                        </FormItem>
                    )}
                />
                
                <FormField
                    control={form.control}
                    name="tagId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>
                            Tag {isTagRequired ? '' : '(Optional)'}
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'no-tag'}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a tag" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {!isTagRequired && <SelectItem value="no-tag">No Tag</SelectItem>}
                            {tags?.map(tag => (
                                <SelectItem key={tag.id} value={tag.id}>
                                    <div className="flex items-center">
                                        {renderIcon(tag.icon)}
                                        {tag.name}
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
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>
                            Description {isDescriptionRequired ? '' : '(Optional)'}
                        </FormLabel>
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

    if (isDesktop) {
        return (
            <DesktopAddExpenseDialog open={open} setOpen={setOpen} expenseToEdit={expenseToEdit} sharedExpenseId={sharedExpenseId} initialType={initialType}>
                {children}
            </DesktopAddExpenseDialog>
        );
    }

    return (
        <MobileAddExpenseDrawer open={open} setOpen={setOpen} expenseToEdit={expenseToEdit} sharedExpenseId={sharedExpenseId} initialType={initialType}>
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
    const { form, onFinalSubmit, onSaveAndNewSubmit, handleDelete, isLoading, transactionType, isEditMode, formId, accounts, categories, tags } = useExpenseForm(setOpen, expenseToEdit, sharedExpenseId, initialType);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="font-headline">{isEditMode ? 'Edit Transaction' : 'Add a New Transaction'}</DialogTitle>
                    <DialogDescription>{isEditMode ? 'Update the details of your transaction.' : 'Fill in the details of your income or expense below.'}</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <ExpenseForm form={form} onSubmit={onFinalSubmit} id={formId} transactionType={transactionType} accounts={accounts} categories={categories} tags={tags} />
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
    const { form, onFinalSubmit, onSaveAndNewSubmit, handleDelete, isLoading, transactionType, isEditMode, formId, accounts, categories, tags } = useExpenseForm(setOpen, expenseToEdit, sharedExpenseId, initialType);
    
    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>{children}</DrawerTrigger>
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle>{isEditMode ? 'Edit Transaction' : 'Add a New Transaction'}</DrawerTitle>
                    <DrawerDescription>{isEditMode ? 'Update the details of your transaction.' : 'Fill in the details of your income or expense below.'}</DrawerDescription>
                </DrawerHeader>
                 <div className="overflow-y-auto px-4">
                    <ExpenseForm form={form} onSubmit={onFinalSubmit} id={formId} transactionType={transactionType} accounts={accounts} categories={categories} tags={tags}/>
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


// Shared hook for form logic
function useExpenseForm(
    setOpen: (open: boolean) => void,
    expenseToEdit?: EnrichedExpense, 
    sharedExpenseId?: string,
    initialType?: 'income' | 'expense',
) {
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

    const form = useForm<z.infer<typeof expenseSchema>>({
        resolver: zodResolver(expenseSchema),
    });

    const transactionType = form.watch('type');

    const resetAndPopulateForm = () => {
        if (isEditMode && expenseToEdit) {
            form.reset({
                type: expenseToEdit.type,
                amount: expenseToEdit.amount,
                date: expenseToEdit.date,
                accountId: expenseToEdit.account?.id || '',
                categoryId: expenseToEdit.category?.id || 'no-category',
                description: expenseToEdit.description || '',
                tagId: expenseToEdit.tag?.id || 'no-tag',
            });
        } else {
            form.reset({
                type: initialType || 'expense',
                amount: '' as any, // Initialize with empty string to avoid uncontrolled input error
                date: new Date(),
                accountId: '',
                categoryId: 'no-category',
                description: '',
                tagId: 'no-tag',
            });
        }
    };
    
    // Reset form when dialog opens
    useEffect(() => {
        resetAndPopulateForm();
    }, [expenseToEdit, userProfile, isEditMode, initialType]);

    const handleTransactionSave = async (values: z.infer<typeof expenseSchema>) => {
        if (!firestore || !user || !tags || !accounts) {
            toast({ variant: 'destructive', title: 'Error', description: 'Required data is not loaded.' });
            return false;
        }
        setIsLoading(true);

        try {
            const batch = writeBatch(firestore);

            // --- Special logic for Credit Limit Upgrade ---
            const selectedTag = tags.find(t => t.id === values.tagId);
            const selectedAccount = accounts.find(a => a.id === values.accountId);

            if (selectedTag?.name === 'Credit Limit Upgrade' && selectedAccount?.type === 'credit_card') {
                const accountRef = doc(firestore, `users/${user.uid}/accounts`, values.accountId);
                batch.update(accountRef, { limit: values.amount });
                await batch.commit();
                toast({ title: 'Credit Limit Updated!', description: `The limit for ${selectedAccount.name} is now ${values.amount}.` });
                setIsLoading(false);
                return true; // End execution here for this special case
            }
            // --- End of special logic ---


            const collectionPath = sharedExpenseId ? `shared_expenses/${sharedExpenseId}/expenses` : `users/${user.uid}/expenses`;

            if (isEditMode && expenseToEdit) {
                // --- EDIT LOGIC ---
                const expenseRef = doc(firestore, collectionPath, expenseToEdit.id);
                
                // For non-shared expenses, update account balance
                if (!sharedExpenseId) {
                    // Reverse old transaction amount
                    const oldAccountRef = doc(firestore, `users/${user.uid}/accounts`, expenseToEdit.accountId);
                    const oldAmount = expenseToEdit.type === 'income' ? -expenseToEdit.amount : expenseToEdit.amount;
                    batch.update(oldAccountRef, { balance: increment(oldAmount) });

                    // Apply new transaction amount
                    const newAccountRef = doc(firestore, `users/${user.uid}/accounts`, values.accountId);
                    const newAmount = values.type === 'income' ? values.amount : -values.amount;
                    batch.update(newAccountRef, { balance: increment(newAmount) });
                }
                
                // Update expense document
                const updatedData = { ...values, tagId: values.tagId === 'no-tag' ? '' : values.tagId, categoryId: values.categoryId === 'no-category' ? '' : values.categoryId };
                batch.update(expenseRef, updatedData);

            } else {
                // --- ADD LOGIC ---
                const expenseCol = collection(firestore, collectionPath);
                const newExpenseRef = doc(expenseCol);
                const expenseData = {
                  ...values,
                  id: newExpenseRef.id,
                  userId: user.uid,
                  createdAt: serverTimestamp(),
                  sharedExpenseId: sharedExpenseId || '',
                  tagId: values.tagId === 'no-tag' || !values.tagId ? '' : values.tagId,
                  categoryId: values.categoryId === 'no-category' || !values.categoryId ? '' : values.categoryId,
                };
                batch.set(newExpenseRef, expenseData);
    
                // For non-shared expenses, update account balance
                if (!sharedExpenseId) {
                    const accountRef = doc(firestore, `users/${user.uid}/accounts`, values.accountId);
                    const amountToUpdate = values.type === 'income' ? values.amount : -values.amount;
                    batch.update(accountRef, { balance: increment(amountToUpdate) });
                }
            }

            await batch.commit();
            toast({ title: isEditMode ? 'Transaction Updated!' : 'Transaction Added!', description: `Your ${values.type} has been recorded.` });
            return true;
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Uh oh! Something went wrong.', description: error.message || 'Could not save transaction.' });
             return false;
        } finally {
            setIsLoading(false);
        }
    }

    const onFinalSubmit = form.handleSubmit(async (values) => {
        const success = await handleTransactionSave(values);
        if (success) {
            setOpen(false);
        }
    });

    const onSaveAndNewSubmit = form.handleSubmit(async (values) => {
        const success = await handleTransactionSave(values);
        if (success) {
            // Reset form for a new entry, keeping some fields if sensible
            form.reset({
                ...values, // keep account, type, etc.
                amount: '' as any,
                description: '',
                date: new Date(),
            });
        }
    });

    const handleDelete = async () => {
        if (!firestore || !user || !isEditMode || !expenseToEdit) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete transaction.' });
            return;
        }
        setIsLoading(true);
        try {
            const batch = writeBatch(firestore);
            const collectionPath = sharedExpenseId ? `shared_expenses/${sharedExpenseId}/expenses` : `users/${user.uid}/expenses`;
            const expenseRef = doc(firestore, collectionPath, expenseToEdit.id);

            // Delete the expense document
            batch.delete(expenseRef);

            // If it's not a shared expense, adjust the account balance
            if (!sharedExpenseId) {
                const accountRef = doc(firestore, `users/${user.uid}/accounts`, expenseToEdit.accountId);
                const amountToRevert = expenseToEdit.type === 'income' ? -expenseToEdit.amount : expenseToEdit.amount;
                batch.update(accountRef, { balance: increment(amountToRevert) });
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
      transactionType, 
      isEditMode, 
      formId,
      accounts: accounts || [],
      categories: categories || [],
      tags: tags || []
    };
}
