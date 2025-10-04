'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { UserProfile, Category, PaymentMethod, Tag } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/currencies';
import * as LucideIcons from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

const expenseSchema = z.object({
  amount: z.coerce.number().positive({ message: 'Amount must be positive.' }),
  categoryId: z.string().min(1, { message: 'Please select a category.' }),
  description: z.string().optional(),
  date: z.date({ required_error: 'A date is required.' }),
  paymentMethodId: z.string().min(1, { message: 'Please select a payment method.' }),
  tagId: z.string().optional(),
});


export function AddExpenseDialog({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();

    // Fetch relational data for dropdowns
    const categoriesQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/categories`) : null, [user, firestore]);
    const paymentMethodsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/paymentMethods`) : null, [user, firestore]);
    const tagsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/tags`) : null, [user, firestore]);
    
    const { data: categories } = useCollection<Category>(categoriesQuery);
    const { data: paymentMethods } = useCollection<PaymentMethod>(paymentMethodsQuery);
    const { data: tags } = useCollection<Tag>(tagsQuery);
    
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Add a New Expense</DialogTitle>
          <DialogDescription>Fill in the details of your expense below.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-6 -mr-6">
            <Form {...form}>
            <form className="space-y-4">
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
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a payment method" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                        <FormLabel>Tag / Label (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a tag" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="no-tag">No Tag</SelectItem>
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
                        <FormLabel>Description (Optional)</FormLabel>
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
                    <Popover>
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
                            onSelect={field.onChange}
                            disabled={(date) =>
                            date > new Date() || date < new Date('1900-01-01')
                            }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </form>
            </Form>
        </ScrollArea>
        <DialogFooter className="pt-4">
            <Button 
                variant="outline"
                onClick={form.handleSubmit(v => handleSave(v, false))} 
                disabled={isLoading}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save and Add New
            </Button>
            <Button 
                onClick={form.handleSubmit(v => handleSave(v, true))} 
                disabled={isLoading}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Expense
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
