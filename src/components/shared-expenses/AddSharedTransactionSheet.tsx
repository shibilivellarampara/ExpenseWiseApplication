
'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '../ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import { useFirestore, useUser, addDocumentNonBlocking, useCollection } from '@/firebase';
import { collection, serverTimestamp, query, where } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { cn } from '@/lib/utils';
import { SharedCategory, SharedTag } from '@/lib/types';
import { DateTimePicker } from '../DateTimePicker';

const transactionSchema = z.object({
  type: z.enum(['expense', 'income']).default('expense'),
  date: z.date({ required_error: 'A date is required.' }),
  amount: z.coerce.number().positive({ message: 'Amount must be positive.' }),
  description: z.string().min(1, 'Description is required.'),
  // categoryId and tagIds are optional for now
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface AddSharedTransactionSheetProps {
    children: React.ReactNode;
    ledgerId: string;
}

export function AddSharedTransactionSheet({ children, ledgerId }: AddSharedTransactionSheetProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();

    // Fetch categories and tags specific to this ledger
    const categoriesQuery = useMemo(() => query(collection(firestore, 'shared_categories'), where('ledgerId', '==', ledgerId)), [firestore, ledgerId]);
    const { data: categories } = useCollection<SharedCategory>(categoriesQuery);
    
    const tagsQuery = useMemo(() => query(collection(firestore, 'shared_tags'), where('ledgerId', '==', ledgerId)), [firestore, ledgerId]);
    const { data: tags } = useCollection<SharedTag>(tagsQuery);

    const form = useForm<TransactionFormData>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            type: 'expense',
            amount: undefined,
            date: new Date(),
            description: '',
        },
    });

    async function onSubmit(values: TransactionFormData) {
        setIsLoading(true);
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            setIsLoading(false);
            return;
        }

        try {
            const transactionData = {
                ...values,
                ledgerId,
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                source: 'manual',
            };
            
            const transactionsCol = collection(firestore, `shared_transactions`);
            await addDocumentNonBlocking(transactionsCol, transactionData);
            
            toast({ title: 'Transaction Added!', description: 'The new transaction has been recorded in the shared ledger.' });
            setOpen(false);
            form.reset();

        } catch (error: any) {
            let description = "There was an unexpected error. Please try again.";
            if (error.message.includes("invalid data")) {
                description = "Some of the data you entered is invalid. Please check all fields and try again.";
            }
            toast({ variant: 'destructive', title: 'Could Not Save Transaction', description });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{children}</SheetTrigger>
            <SheetContent className="overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="font-headline">Add Shared Transaction</SheetTitle>
                    <SheetDescription>
                        Add a new transaction to this shared ledger.
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
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
                                            <FormLabel className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base", field.value === 'expense' ? "border-destructive text-destructive" : "border-muted")}>
                                                <RadioGroupItem value="expense" className="sr-only" />
                                                <span>Expense</span>
                                            </FormLabel>
                                        </FormItem>
                                        <FormItem>
                                            <FormLabel className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base", field.value === 'income' ? "border-green-600 text-green-600" : "border-muted")}>
                                                <RadioGroupItem value="income" className="sr-only" />
                                                <span>Income</span>
                                            </FormLabel>
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
                                <FormItem className="flex flex-col">
                                    <FormLabel>Date</FormLabel>
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
                                        <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Groceries for the week" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Transaction"}
                        </Button>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}

    