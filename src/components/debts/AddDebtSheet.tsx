
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
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { DateTimePicker } from '../DateTimePicker';

const debtSchema = z.object({
  personName: z.string().min(1, 'Person\'s name is required.'),
  amount: z.coerce.number().positive('Amount must be positive.'),
  type: z.enum(['lent', 'borrowed']),
  description: z.string().optional(),
  date: z.date({ required_error: 'A date is required.' }),
});

type DebtFormData = z.infer<typeof debtSchema>;

interface AddDebtSheetProps {
    children: React.ReactNode;
}

export function AddDebtSheet({ children }: AddDebtSheetProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();

    const form = useForm<DebtFormData>({
        resolver: zodResolver(debtSchema),
        defaultValues: {
            personName: '',
            amount: 0,
            type: 'lent',
            description: '',
            date: new Date(),
        },
    });

    useEffect(() => {
        if(open) {
            form.reset({
                personName: '',
                amount: 0,
                type: 'lent',
                description: '',
                date: new Date(),
            });
        }
    }, [open, form]);

    async function onSubmit(values: DebtFormData) {
        setIsLoading(true);
        if (!firestore || !user) {
             toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
             setIsLoading(false);
             return;
        }

        try {
            const debtsCol = collection(firestore, `users/${user.uid}/debts`);
            addDocumentNonBlocking(debtsCol, {
                ...values,
                userId: user.uid,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            
            toast({
                title: 'Record Added!',
                description: 'Your debt/due has been recorded.',
            });
            setOpen(false);

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{children}</SheetTrigger>
            <SheetContent className="overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="font-headline">Add Debt or Due</SheetTitle>
                    <SheetDescription>
                        Track money you've lent to others or borrowed from them.
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
                                            <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base", field.value === 'lent' ? "border-green-600 text-green-600" : "border-muted")}>
                                                <RadioGroupItem value="lent" className="sr-only" />
                                                <span>You Lent</span>
                                                <span className="text-xs font-normal">(Someone owes you)</span>
                                            </Label>
                                        </FormItem>
                                        <FormItem>
                                            <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base", field.value === 'borrowed' ? "border-destructive text-destructive" : "border-muted")}>
                                                <RadioGroupItem value="borrowed" className="sr-only" />
                                                <span>You Borrowed</span>
                                                 <span className="text-xs font-normal">(You owe someone)</span>
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
                            name="personName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Person's Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., John Doe" {...field} />
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
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., For lunch" {...field} />
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
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Record"}
                        </Button>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}
