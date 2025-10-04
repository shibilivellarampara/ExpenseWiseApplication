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
import { useForm } from 'react-hook-form';
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
import { format } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { UserProfile, Category, PaymentMethod, Tag } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/currencies';
import * as LucideIcons from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useMediaQuery } from '@/hooks/use-media-query';

// Function to create a dynamic schema
const createExpenseSchema = (settings?: UserProfile['expenseFieldSettings']) => {
  return z.object({
    amount: z.coerce.number().positive({ message: 'Amount must be positive.' }),
    date: z.date({ required_error: 'A date is required.' }),
    
    categoryId: settings?.isCategoryRequired
      ? z.string().min(1, 'Please select a category.')
      : z.string().optional(),
    
    paymentMethodId: settings?.isPaymentMethodRequired
      ? z.string().min(1, 'Please select a payment method.')
      : z.string().optional(),
    
    description: settings?.isDescriptionRequired
      ? z.string().min(1, 'Description is required.')
      : z.string().optional(),

    tagId: settings?.isTagRequired
      ? z.string().min(1, 'Please select a tag.')
      : z.string().optional(),
  });
};


function DatePicker({ field }: { field: any }) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant={'outline'}
              className={cn(
                'w-full pl-3 text-left font-normal',
                !field.value && 'text-muted-foreground'
              )}
            >
              {field.value ? (
                format(field.value, 'PPP')
              ) : (
                <span>Pick a date</span>
              )}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={field.value}
            onSelect={(date) => {
              field.onChange(date);
              setOpen(false);
            }}
            disabled={(date) =>
              date > new Date() || date < new Date('1900-01-01')
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
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
                format(field.value, 'PPP')
              ) : (
                <span>Pick a date</span>
              )}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
            <DrawerTitle>Select Date</DrawerTitle>
            <DrawerDescription>
                Choose the date when the expense occurred.
            </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
        <Calendar
          mode="single"
          selected={field.value}
          onSelect={(date) => {
            field.onChange(date);
            setOpen(false);
          }}
          disabled={(date) =>
            date > new Date() || date < new Date('1900-01-01')
          }
          initialFocus
        />
        </div>
        <DrawerFooter>
            <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
            </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function ExpenseForm({ className }: { className?: string }) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const [open, setOpen] = useState(false);


    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    // Memoize the schema so it only changes when settings do
    const expenseSchema = useMemo(() => createExpenseSchema(userProfile?.expenseFieldSettings), [userProfile?.expenseFieldSettings]);

    const form = useForm<z.infer<typeof expenseSchema>>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            amount: 0,
            categoryId: '',
            description: '',
            date: new Date(),
            paymentMethodId: '',
            tagId: '',
        },
    });
     
    // Fetch relational data for dropdowns
    const categoriesQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/categories`) : null, [user, firestore]);
    const paymentMethodsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/paymentMethods`) : null, [user, firestore]);
    const tagsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/tags`) : null, [user, firestore]);
    
    const { data: categories } = useCollection<Category>(categoriesQuery);
    const { data: paymentMethods } = useCollection<PaymentMethod>(paymentMethodsQuery);
    const { data: tags } = useCollection<Tag>(tagsQuery);
    
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    // Reset the form whenever the schema changes (i.e., when settings change)
    // or when the dialog is opened.
    useEffect(() => {
        form.reset();
    }, [open, userProfile, form]);

    const resetForm = () => {
        form.reset({
            amount: 0,
            categoryId: '',
            description: '',
            date: new Date(),
            paymentMethodId: '',
            tagId: '',
        });
    }

    const handleSave = async (values: z.infer<typeof expenseSchema>, shouldClose: boolean) => {
        setIsLoading(true);
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to add an expense.' });
            setIsLoading(false);
            return;
        }

        const expenseData = {
          ...values,
          userId: user.uid,
          createdAt: serverTimestamp(),
          tagId: values.tagId === 'no-tag' ? '' : values.tagId,
        };

        try {
            const expensesCol = collection(firestore, `users/${user.uid}/expenses`);
            addDocumentNonBlocking(expensesCol, expenseData);
            
            toast({ title: 'Expense Added!', description: `Your expense has been recorded.` });
            
            resetForm();
            if (shouldClose) {
                setOpen(false);
            }
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Uh oh! Something went wrong.', description: error.message || 'Could not save expense.' });
        } finally {
            setIsLoading(false);
        }
    }
    
    const renderIcon = (iconName: string | undefined) => {
        if (!iconName) return <Pilcrow className="mr-2 h-4 w-4" />;
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="mr-2 h-4 w-4" /> : <Pilcrow className="mr-2 h-4 w-4" />;
    };

    // Determine if fields are required for UI cues
    const isDescriptionRequired = userProfile?.expenseFieldSettings?.isDescriptionRequired ?? false;
    const isTagRequired = userProfile?.expenseFieldSettings?.isTagRequired ?? false;
    const isCategoryRequired = userProfile?.expenseFieldSettings?.isCategoryRequired ?? true;
    const isPaymentMethodRequired = userProfile?.expenseFieldSettings?.isPaymentMethodRequired ?? true;
    
    const isDesktop = useMediaQuery("(min-width: 768px)");

    return (
        <Form {...form}>
            <form className={cn("grid items-start gap-4", className)}>
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

                <FormField
                    control={form.control}
                    name="paymentMethodId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>
                          Payment Method {isPaymentMethodRequired ? '' : '(Optional)'}
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a payment method" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {!isPaymentMethodRequired && <SelectItem value="">No Payment Method</SelectItem>}
                            {paymentMethods?.map(method => (
                                <SelectItem key={method.id} value={method.id}>
                                <div className="flex items-center">
                                        {renderIcon(method.icon)}
                                        {method.name}
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
                            Tag / Label {isTagRequired ? '' : '(Optional)'}
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            <Textarea placeholder="e.g., Groceries from Walmart" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Expense</FormLabel>
                      <DatePicker field={field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                 {isDesktop ? null : (
                     <DrawerFooter className="pt-2">
                        <Button 
                            onClick={form.handleSubmit(v => handleSave(v, true))} 
                            disabled={isLoading}
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Expense
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DrawerClose>
                    </DrawerFooter>
                 )}
            </form>
        </Form>
    );
}


export function AddExpenseDialog({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const isDesktop = useMediaQuery("(min-width: 768px)");

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
                <DialogHeader>
                <DialogTitle className="font-headline">Add a New Expense</DialogTitle>
                <DialogDescription>Fill in the details of your expense below.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-grow pr-6 -mr-6">
                    <ExpenseForm />
                </ScrollArea>
            </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>{children}</DrawerTrigger>
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle>Add a New Expense</DrawerTitle>
                    <DrawerDescription>Fill in the details of your expense below.</DrawerDescription>
                </DrawerHeader>
                 <ScrollArea className="overflow-y-auto">
                    <ExpenseForm className="px-4"/>
                </ScrollArea>
            </DrawerContent>
        </Drawer>
    )
}
