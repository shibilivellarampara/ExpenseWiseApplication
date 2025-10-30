
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
import { useCollection, useFirestore, useUser, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, addDoc, doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Loader2, Pilcrow } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { availableIcons } from '@/lib/defaults';
import * as LucideIcons from 'lucide-react';
import { Account, Category } from '@/lib/types';

const accountSchemaBase = z.object({
    name: z.string().min(1, 'Account name is required.'),
    type: z.enum(['bank', 'credit_card', 'wallet', 'cash']),
    balance: z.coerce.number(),
    limit: z.coerce.number().optional(),
    icon: z.string().min(1, "Icon is required."),
    status: z.enum(['active', 'inactive']).default('active'),
});

const accountSchema = accountSchemaBase.refine(data => data.type !== 'credit_card' || (data.limit !== undefined && data.limit > 0), {
    message: "Credit limit is required for credit card accounts and must be positive.",
    path: ["limit"],
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AddAccountSheetProps {
    children: React.ReactNode;
    accountToEdit?: Account;
}

export function AddAccountSheet({ children, accountToEdit }: AddAccountSheetProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const isEditMode = !!accountToEdit;
    
    const accountsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/accounts`) : null, [user, firestore]);
    const { data: accounts } = useCollection<Account>(accountsQuery);

    const categoriesQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/categories`) : null, [user, firestore]);
    const { data: categories } = useCollection<Category>(categoriesQuery);

    const form = useForm<AccountFormData>({
        resolver: zodResolver(accountSchema.refine(
            (data) => {
                if (isEditMode && accountToEdit?.name === data.name) {
                    return true;
                }
                return !accounts?.some(acc => acc.name.toLowerCase() === data.name.toLowerCase());
            },
            {
                message: "An account with this name already exists.",
                path: ["name"],
            }
        )),
        defaultValues: {
            name: '',
            type: 'bank',
            balance: 0,
            icon: 'Landmark',
            limit: undefined,
            status: 'active',
        },
    });

    const accountType = form.watch('type');

    useEffect(() => {
        if(open) {
            if (isEditMode && accountToEdit) {
                 form.reset({
                    name: accountToEdit.name,
                    type: accountToEdit.type,
                    balance: accountToEdit.balance,
                    icon: accountToEdit.icon,
                    limit: accountToEdit.limit,
                    status: accountToEdit.status,
                });
            } else {
                form.reset({
                    name: '',
                    type: 'bank',
                    balance: 0,
                    icon: 'Landmark',
                    limit: undefined,
                    status: 'active',
                });
            }
        }
    }, [open, form, isEditMode, accountToEdit]);

    async function onSubmit(values: AccountFormData) {
        setIsLoading(true);
        if (!firestore || !user || !categories) {
             toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in and categories must be loaded.' });
             setIsLoading(false);
             return;
        }

        const accountData: any = {
            ...values,
            userId: user.uid,
        };
        
        if (values.type !== 'credit_card') {
            delete accountData.limit;
        }

        try {
            if (isEditMode && accountToEdit) {
                const accountRef = doc(firestore, `users/${user.uid}/accounts`, accountToEdit.id);
                setDocumentNonBlocking(accountRef, accountData, { merge: true });
                toast({
                    title: 'Account Updated!',
                    description: 'Your account details have been saved.',
                });
            } else {
                const accountsCol = collection(firestore, `users/${user.uid}/accounts`);
                const newAccountRef = await addDoc(accountsCol, {});
                
                setDocumentNonBlocking(newAccountRef, { ...accountData, id: newAccountRef.id });
                
                const expensesCol = collection(firestore, `users/${user.uid}/expenses`);
                
                if (values.type !== 'credit_card' && values.balance !== 0) {
                    addDocumentNonBlocking(expensesCol, {
                        userId: user.uid,
                        type: 'income',
                        amount: Math.abs(values.balance),
                        description: 'Initial Balance',
                        date: new Date(),
                        createdAt: serverTimestamp(),
                        accountId: newAccountRef.id,
                    });
                }
                
                if (values.type === 'credit_card' && values.limit && values.limit > 0) {
                    const upgradeCategory = categories.find(c => c.name === 'Credit Limit Upgrade');
                    if (upgradeCategory) {
                        addDocumentNonBlocking(expensesCol, {
                            userId: user.uid,
                            type: 'income',
                            amount: values.limit,
                            description: 'Initial Credit Limit',
                            date: new Date(),
                            createdAt: serverTimestamp(),
                            accountId: newAccountRef.id,
                            categoryId: upgradeCategory.id,
                        });
                    }
                }
                
                toast({
                    title: 'Account Added!',
                    description: 'The new account has been created.',
                });
            }
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
                    <SheetTitle className="font-headline">{isEditMode ? 'Edit Account' : 'Add New Account'}</SheetTitle>
                    <SheetDescription>
                        {isEditMode ? 'Update the details for your account.' : 'Create a new account to track your finances.'}
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
                                        {accountType === 'credit_card' ? 'Current Outstanding Amount' : 'Current Balance'}
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="0.00" {...field} disabled={isEditMode} />
                                    </FormControl>
                                     {isEditMode && <FormDescription>Balance can only be changed by adding transactions.</FormDescription>}
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
                                            <Input type="number" placeholder="50000" {...field} value={field.value ?? ''} disabled={isEditMode} />
                                        </FormControl>
                                        {isEditMode && <FormDescription>Limit can only be changed via a "Credit Limit Upgrade" transaction.</FormDescription>}
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
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditMode ? "Save Changes" : "Save Account"}
                        </Button>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}
