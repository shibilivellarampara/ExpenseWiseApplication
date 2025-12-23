
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
import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, addDocumentNonBlocking, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { SharedCategory, SharedTag, SharedTransaction } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { DateTimePicker } from '../DateTimePicker';

const addTransactionSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  amount: z.coerce.number().positive('Amount must be positive.'),
  type: z.enum(['expense', 'income']),
  date: z.date(),
});

type AddTransactionFormData = z.infer<typeof addTransactionSchema>;

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

  const form = useForm<AddTransactionFormData>({
    resolver: zodResolver(addTransactionSchema),
    defaultValues: {
      description: '',
      amount: undefined,
      type: 'expense',
      date: new Date(),
    },
  });

  useEffect(() => {
    if(open) {
        form.reset({
            description: '',
            amount: undefined,
            type: 'expense',
            date: new Date(),
        })
    }
  }, [open, form]);

  async function onSubmit(values: AddTransactionFormData) {
    if (!firestore || !user || !ledgerId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add transaction.' });
      return;
    }
    setIsLoading(true);

    try {
        const batch = writeBatch(firestore);
        const transactionRef = doc(collection(firestore, `shared_expenses/${ledgerId}/transactions`));

        const newTransaction: Omit<SharedTransaction, 'id'> = {
            createdBy: user.uid,
            description: values.description,
            amount: values.amount,
            type: values.type,
            date: values.date as any, // Cast because SDK handles Date -> Timestamp
        };
        
        batch.set(transactionRef, newTransaction);
        
        // TODO: Update ledger balance
        
        await batch.commit();

        toast({
            title: 'Transaction Added!',
            description: `Your ${values.type} has been added to the ledger.`,
        });
        setOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Could Not Add Transaction', description: "There was an unexpected error. Please try again." });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="font-headline">Add Transaction</SheetTitle>
          <SheetDescription>
            Add a new expense or income to this shared ledger.
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
                                <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base", field.value === 'expense' ? "border-destructive text-destructive" : "border-muted")}>
                                    <RadioGroupItem value="expense" className="sr-only" />
                                    <span>Expense</span>
                                </Label>
                            </FormItem>
                                <FormItem>
                                <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base", field.value === 'income' ? "border-green-600 text-green-600" : "border-muted")}>
                                    <RadioGroupItem value="income" className="sr-only" />
                                    <span>Income</span>
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
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Dinner, Movie Tickets" {...field} />
                    </FormControl>
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
                        <Input type="number" placeholder="0.00" {...field} />
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
                        <FormLabel>Date & Time</FormLabel>
                        <DateTimePicker field={field} />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add Transaction"}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

