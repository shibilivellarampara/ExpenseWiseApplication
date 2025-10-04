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
import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Loader2, Pilcrow } from 'lucide-react';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { availableIcons } from '@/lib/defaults';
import * as LucideIcons from 'lucide-react';

const accountSchema = z.object({
    name: z.string().min(1, 'Account name is required.'),
    type: z.enum(['bank', 'credit_card', 'wallet', 'cash']),
    balance: z.coerce.number(),
    limit: z.coerce.number().optional(),
    icon: z.string().min(1, "Icon is required."),
}).refine(data => data.type !== 'credit_card' || (data.limit !== undefined && data.limit > 0), {
    message: "Credit limit is required for credit card accounts and must be positive.",
    path: ["limit"],
});

interface AddAccountSheetProps {
    children: React.ReactNode;
}

export function AddAccountSheet({ children }: AddAccountSheetProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();

    const form = useForm<z.infer<typeof accountSchema>>({
        resolver: zodResolver(accountSchema),
        defaultValues: {
            name: '',
            type: 'bank',
            balance: 0,
            icon: 'Landmark',
        },
    });

    const accountType = form.watch('type');

    useEffect(() => {
        if(open) {
            form.reset({
                name: '',
                type: 'bank',
                balance: 0,
                icon: 'Landmark',
                limit: undefined,
            });
        }
    }, [open, form]);

    async function onSubmit(values: z.infer<typeof accountSchema>) {
        setIsLoading(true);
        if (!firestore || !user) {
             toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
             setIsLoading(false);
             return;
        }

        const accountData: any = {
            ...values,
            userId: user.uid,
        };

        if (isNaN(accountData.limit) || accountData.limit === undefined) {
            delete accountData.limit;
        }

        try {
            const accountsCol = collection(firestore, `users/${user.uid}/accounts`);
            await addDoc(accountsCol, accountData);
            
            toast({
                title: 'Account Added!',
                description: 'The new account has been created.',
            });
            setOpen(false);

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }
    
    const renderIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="h-5 w-5" /> : <Pilcrow className="h-5 w-5" />;
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{children}</SheetTrigger>
            <SheetContent className="overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="font-headline">Add New Account</SheetTitle>
                    <SheetDescription>
                        Create a new account to track your finances.
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Account Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Savings Account" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Account Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an account type" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="bank">Bank Account</SelectItem>
                                        <SelectItem value="credit_card">Credit Card</SelectItem>
                                        <SelectItem value="wallet">Digital Wallet</SelectItem>
                                        <SelectItem value="cash">Cash</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="balance"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {accountType === 'credit_card' ? 'Outstanding Amount' : 'Current Balance'}
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="0.00" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {accountType === 'credit_card' && (
                             <FormField
                                control={form.control}
                                name="limit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Credit Limit</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="50000" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                         <FormField
                            control={form.control}
                            name="icon"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Icon</FormLabel>
                                    <FormControl>
                                         <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start">
                                                    {renderIcon(field.value)}
                                                    <span className="ml-2">{field.value}</span>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto grid grid-cols-5 gap-2">
                                                {availableIcons.map(icon => (
                                                    <Button key={icon} variant="ghost" size="icon" onClick={() => field.onChange(icon)}>
                                                        {renderIcon(icon)}
                                                    </Button>
                                                ))}
                                            </PopoverContent>
                                        </Popover>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Account"}
                        </Button>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}
