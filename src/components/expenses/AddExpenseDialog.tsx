'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Pilcrow } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, setHours, setMinutes, getHours, getMinutes } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { UserProfile, Category, Tag, Account } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/currencies';
import * as LucideIcons from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';

// Function to create a dynamic schema
const createExpenseSchema = (settings?: UserProfile['expenseFieldSettings']) => {
  return z.object({
    type: z.enum(['expense', 'income']).default('expense'),
    amount: z.coerce.number().positive({ message: 'Amount must be positive.' }),
    date: z.date({ required_error: 'A date is required.' }),
    
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
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleDateSelect = (date: Date | undefined) => {
    if (!date || !field.value) return;
    const newDate = setHours(setMinutes(date, getMinutes(field.value)), getHours(field.value));
    field.onChange(newDate);
    if (!isDesktop) {
        setDatePickerOpen(false);
    }
  };

  const handleTimeChange = (part: 'hours' | 'minutes', value: string) => {
    const numberValue = parseInt(value, 10);
    if (!field.value) return;
    const newDate = part === 'hours' ? setHours(field.value, numberValue) : setMinutes(field.value, numberValue);
    field.onChange(newDate);
  }

  const calendar = (
     <div className="space-y-2">
      <Calendar
        mode="single"
        selected={field.value}
        onSelect={handleDateSelect}
        disabled={(date) =>
          date > new Date() || date < new Date('1900-01-01')
        }
        initialFocus
        className="mx-auto"
      />
      <div className="flex gap-2 justify-center px-4">
          <Select onValueChange={(value) => handleTimeChange('hours', value)} value={String(getHours(field.value))}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                  {Array.from({length: 24}, (_, i) => <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}</SelectItem>)}
              </SelectContent>
          </Select>
           <Select onValueChange={(value) => handleTimeChange('minutes', value)} value={String(getMinutes(field.value))}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                  {Array.from({length: 60}, (_, i) => <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}</SelectItem>)}
              </SelectContent>
          </Select>
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant={'outline'}
              className={cn(
                'w-[240px] pl-3 text-left font-normal',
                !field.value && 'text-muted-foreground'
              )}
            >
              {field.value ? (
                format(field.value, 'PPP, hh:mm a')
              ) : (
                <span>Pick a date</span>
              )}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {calendar}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
      <DrawerTrigger asChild>
        <FormControl>
            <Button
              variant={'outline'}
              className={cn(
                'w-full pl-3 text-left font-normal',
                !field.value && 'text-muted-foreground'
              )}
            >
              {field.value ? (
                format(field.value, 'PPP, hh:mm a')
              ) : (
                <span>Pick a date</span>
              )}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
            <DrawerTitle>Select Date & Time</DrawerTitle>
            <DrawerDescription>
                Choose the date and time when the transaction occurred.
            </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
         {calendar}
        </div>
        <DrawerFooter className="pt-2">
            <DrawerClose asChild>
                <Button variant="outline">Done</Button>
            </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function ExpenseForm({
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

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
     
    // Fetch relational data for dropdowns
    const categoriesQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/categories`) : null, [user, firestore]);
    const accountsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/accounts`) : null, [user, firestore]);
    const tagsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/tags`) : null, [user, firestore]);
    
    const { data: categories } = useCollection<Category>(categoriesQuery);
    const { data: accounts } = useCollection<Account>(accountsQuery);
    const { data: tags } = useCollection<Tag>(tagsQuery);
    
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
    
    const transactionType = form.watch('type');

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
                                    <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground", field.value === 'expense' ? "border-red-500 text-red-500" : "border-muted")}>
                                        <RadioGroupItem value="expense" className="sr-only" />
                                        <span>Cash Out</span>
                                    </Label>
                                </FormItem>
                                 <FormItem>
                                    <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground", field.value === 'income' ? "border-green-500 text-green-500" : "border-muted")}>
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
                            <FormLabel>Date:</FormLabel>
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
                        <FormLabel>Amount ({userProfile?.defaultCurrency || 'USD'})</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <span className="text-gray-500 sm:text-sm">{currencySymbol}</span>
                                </div>
                                <Input type="number" placeholder="0.00" {...field} className="pl-7" />
                            </div>
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
                            {accounts?.map(acc => (
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
                
                {transactionType === 'expense' && (
                    <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>
                              Category {isCategoryRequired ? '' : '(Optional)'}
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {!isCategoryRequired && <SelectItem value="">No Category</SelectItem>}
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
                )}
                
                {transactionType === 'expense' && (
                    <FormField
                        control={form.control}
                        name="tagId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>
                                Tag {isTagRequired ? '' : '(Optional)'}
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
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
                )}

                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>
                            Description {isDescriptionRequired ? '' : '(Optional)'}
                        </FormLabel>
                        <FormControl>
                            <Input placeholder={transactionType === 'expense' ? 'e.g., Groceries from Walmart' : 'e.g., Monthly Salary'} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

            </form>
        </Form>
    );
}


export function AddExpenseDialog({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const formId = useMemo(() => `expense-form-${Math.random().toString(36).substring(7)}`, []);

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const expenseSchema = useMemo(() => createExpenseSchema(userProfile?.expenseFieldSettings), [userProfile?.expenseFieldSettings]);

    const form = useForm<z.infer<typeof expenseSchema>>({
        resolver: zodResolver(expenseSchema),
    });

    const resetForm = () => {
        form.reset({
            type: 'expense',
            amount: '' as any, // Reset as empty string to avoid uncontrolled to controlled error
            accountId: '',
            categoryId: '',
            description: '',
            date: new Date(),
            tagId: '',
        });
    }

    useEffect(() => {
        if (open) {
            resetForm();
        }
    }, [open, userProfile]);

    const handleTransactionSave = async (values: z.infer<typeof expenseSchema>) => {
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to add a transaction.' });
            return false;
        }
        setIsLoading(true);
        try {
            const batch = writeBatch(firestore);
            const expenseCol = collection(firestore, `users/${user.uid}/expenses`);
            const newExpenseRef = doc(expenseCol);
            const expenseData = {
              ...values,
              id: newExpenseRef.id,
              userId: user.uid,
              createdAt: serverTimestamp(),
              tagId: values.tagId === 'no-tag' || !values.tagId ? '' : values.tagId,
              categoryId: values.type === 'income' ? '' : values.categoryId,
            };
            batch.set(newExpenseRef, expenseData);

            const accountRef = doc(firestore, `users/${user.uid}/accounts`, values.accountId);
            const amountToUpdate = values.type === 'income' ? values.amount : -values.amount;
            batch.update(accountRef, { balance: increment(amountToUpdate) });

            await batch.commit();
            toast({ title: 'Transaction Added!', description: `Your ${values.type} has been recorded.` });
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
            resetForm();
        }
    });


    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>{children}</DialogTrigger>
                <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="font-headline">Add a New Transaction</DialogTitle>
                        <DialogDescription>Fill in the details of your income or expense below.</DialogDescription>
                    </DialogHeader>
                     <div className="flex-1 overflow-y-auto -mx-6 px-6">
                        <ExpenseForm form={form} onSubmit={onFinalSubmit} id={formId} />
                    </div>
                    <DialogFooter>
                         <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                         <Button type="button" onClick={onSaveAndNewSubmit} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save and Add New
                        </Button>
                         <Button type="submit" form={formId} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Transaction
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // Mobile Drawer
    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>{children}</DrawerTrigger>
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DialogTitle>Add a New Transaction</DialogTitle>
                    <DialogDescription>Fill in the details of your income or expense below.</DialogDescription>
                </DrawerHeader>
                 <div className="overflow-y-auto px-4">
                    <ExpenseForm form={form} onSubmit={onFinalSubmit} id={formId} />
                </div>
                 <DrawerFooter className="pt-2 flex-row gap-2">
                    <Button variant="secondary" className="flex-1" onClick={onSaveAndNewSubmit} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add New
                    </Button>
                    <Button type="submit" form={formId} className="flex-1" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}
