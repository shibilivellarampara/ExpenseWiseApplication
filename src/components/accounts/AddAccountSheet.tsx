

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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '../ui/form';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc as setDocFirestore, writeBatch } from 'firebase/firestore';
import { Loader2, Pilcrow, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { availableIcons } from '@/lib/defaults';
import * as LucideIcons from 'lucide-react';
import { Account, Category, CardDetails } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

const cardDetailsSchema = z.object({
    cardNickname: z.string().optional(),
    last4Digits: z.string().length(4, "Must be 4 digits").optional().or(z.literal('')),
    cardholderName: z.string().optional(),
    expiryMonth: z.coerce.number().min(1).max(12).optional(),
    expiryYear: z.coerce.number().min(new Date().getFullYear()).max(new Date().getFullYear() + 20).optional(),
    network: z.enum(['visa', 'mastercard', 'amex', 'discover', 'rupay', 'other']).optional(),
    statementDate: z.coerce.number().min(1).max(31).optional(),
});


const accountSchemaBase = z.object({
    name: z.string().min(1, 'Account name is required.'),
    type: z.enum(['bank', 'credit_card', 'wallet', 'cash']),
    balance: z.coerce.number().step(0.01),
    limit: z.coerce.number().optional(),
    billingDate: z.coerce.number().min(1).max(31).optional(),
    icon: z.string().min(1, "Icon is required."),
    status: z.enum(['active', 'inactive']).default('active'),
    cardDetails: cardDetailsSchema.optional(),
});

const accountSchema = accountSchemaBase.refine(data => {
    if (data.type !== 'credit_card') return true;
    if (data.balance > 0) {
        return data.limit !== undefined && data.limit > 0;
    }
    return true;
}, {
    message: "A positive credit limit is required if you enter an initial outstanding amount.",
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
    const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
    
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
            balance: undefined,
            icon: 'Landmark',
            limit: undefined,
            billingDate: undefined,
            status: 'active',
            cardDetails: { cardNickname: '', last4Digits: '', cardholderName: '', expiryMonth: undefined, expiryYear: undefined, network: undefined, statementDate: undefined }
        },
    });

    const accountType = form.watch('type');
    const statementDate = form.watch('cardDetails.statementDate');

     useEffect(() => {
        if (accountType === 'credit_card' && statementDate) {
            const date = new Date(2000, 0, statementDate); // Use a non-leap year
            date.setDate(date.getDate() + 15);
            form.setValue('billingDate', date.getDate());
        }
    }, [statementDate, accountType, form]);


    useEffect(() => {
        if(open) {
            if (isEditMode && accountToEdit) {
                 form.reset({
                    name: accountToEdit.name,
                    type: accountToEdit.type,
                    balance: accountToEdit.type === 'credit_card' 
                        ? parseFloat(((accountToEdit.limit || 0) - accountToEdit.balance).toFixed(2))
                        : accountToEdit.balance,
                    icon: accountToEdit.icon,
                    limit: accountToEdit.limit,
                    billingDate: accountToEdit.billingDate,
                    status: accountToEdit.status,
                    cardDetails: accountToEdit.cardDetails || { cardNickname: '', last4Digits: '', cardholderName: '', expiryMonth: undefined, expiryYear: undefined, network: undefined, statementDate: undefined }
                });
            } else {
                form.reset({
                    name: '',
                    type: 'bank',
                    balance: undefined,
                    icon: 'Landmark',
                    limit: undefined,
                    billingDate: undefined,
                    status: 'active',
                    cardDetails: { cardNickname: '', last4Digits: '', cardholderName: '', expiryMonth: undefined, expiryYear: undefined, network: undefined, statementDate: undefined }
                });
            }
        }
    }, [open, form, isEditMode, accountToEdit]);

    async function onSubmit(values: AccountFormData) {
        setIsLoading(true);
        if (!firestore || !user) {
             toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
             setIsLoading(false);
             return;
        }
    
        const accountData: any = { ...values };
        delete accountData.balance; // Balance should not be directly set, it is calculated
    
        // Clean cardDetails
        if (accountData.cardDetails) {
            const cleanedDetails: Partial<CardDetails> = {};
            for (const key in accountData.cardDetails) {
                const value = accountData.cardDetails[key as keyof CardDetails];
                if (value !== undefined && value !== null && value !== '' && !Number.isNaN(value)) {
                    cleanedDetails[key as keyof CardDetails] = value;
                }
            }
            accountData.cardDetails = cleanedDetails;
            if (Object.keys(accountData.cardDetails).length === 0) {
                delete accountData.cardDetails;
            }
        }
    
        if (values.type !== 'credit_card') {
            delete accountData.limit;
            delete accountData.billingDate;
            delete accountData.cardDetails;
        }
    
        try {
            if (isEditMode && accountToEdit) {
                const accountRef = doc(firestore, `users/${user.uid}/accounts`, accountToEdit.id);
                // For edit, we only update specific fields, not the balance.
                await setDocFirestore(accountRef, accountData, { merge: true });
                toast({
                    title: 'Account Updated!',
                    description: 'Your account details have been saved.',
                });
            } else {
                 // For new account
                 const newAccountRef = doc(collection(firestore, `users/${user.uid}/accounts`));
                 const finalBalance = (values.type === 'credit_card') 
                     ? (values.limit || 0) - (values.balance || 0) 
                     : (values.balance || 0);
                 
                 const newAccountData = {
                     ...accountData,
                     id: newAccountRef.id,
                     userId: user.uid,
                     balance: finalBalance,
                 };
 
                 const batch = writeBatch(firestore);
                 batch.set(newAccountRef, newAccountData);
 
                 // If there's an initial balance for a non-credit card, create an initial transaction
                 if (values.type !== 'credit_card' && values.balance) {
                     const expensesCol = collection(firestore, `users/${user.uid}/expenses`);
                     const initialTxRef = doc(expensesCol);
                     batch.set(initialTxRef, {
                         id: initialTxRef.id,
                         userId: user.uid,
                         type: 'income',
                         amount: Math.abs(values.balance),
                         description: 'Initial Balance',
                         date: new Date(),
                         createdAt: serverTimestamp(),
                         accountId: newAccountRef.id,
                     });
                 }
                 await batch.commit();

                toast({
                    title: 'Account Added!',
                    description: 'The new account has been created.',
                });
            }
            setOpen(false);
    
        } catch (error: any) {
             let description = "There was an unexpected error. Please try again.";
            if (error.message.includes("invalid data")) {
                description = "Some of the data you entered is invalid. Please check all fields and try again.";
            }
             toast({ variant: 'destructive', title: 'Could Not Save Account', description });
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
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditMode}>
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
                        {accountType === 'credit_card' && (
                             <>
                                <FormField
                                    control={form.control}
                                    name="limit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Credit Limit</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="50000" {...field} value={field.value ?? ''} disabled={isEditMode} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                             </>
                        )}
                        <FormField
                            control={form.control}
                            name="balance"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {accountType === 'credit_card' ? 'Current Outstanding Amount' : 'Current Balance'}
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" placeholder="0.00" {...field} disabled={isEditMode} />
                                    </FormControl>
                                     {accountType !== 'credit_card' && !isEditMode && <FormDescription>An initial transaction will be created for this amount.</FormDescription>}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {accountType === 'credit_card' && (
                            <>
                                 <FormField
                                    control={form.control}
                                    name="cardDetails.statementDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Statement Date (Day of Month)</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="1" max="31" placeholder="e.g., 10" {...field} value={field.value ?? ''}/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="billingDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Payment Due Date (Day of Month)</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="1" max="31" placeholder="e.g., 25" {...field} value={field.value ?? ''} disabled />
                                            </FormControl>
                                             <FormDescription>Automatically calculated as 15 days after statement date.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}
                         <FormField
                            control={form.control}
                            name="icon"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Icon</FormLabel>
                                    <FormControl>
                                         <Popover open={iconPopoverOpen} onOpenChange={setIconPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start">
                                                    {renderIcon(field.value)}
                                                    <span className="ml-2">{field.value}</span>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto grid grid-cols-5 gap-2">
                                                {availableIcons.map(icon => (
                                                    <Button key={icon} variant="ghost" size="icon" onClick={() => {field.onChange(icon); setIconPopoverOpen(false);}}>
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

                        {accountType === 'credit_card' && (
                             <Collapsible>
                                <CollapsibleTrigger asChild>
                                    <Button variant="link" className="p-0 h-auto flex items-center gap-1">
                                        <ChevronDown className="h-4 w-4" />
                                        Add Card Details (Optional)
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-4 pt-4">
                                    <Separator />
                                     <FormField
                                        control={form.control}
                                        name="cardDetails.cardNickname"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Card Nickname</FormLabel>
                                                <FormControl><Input placeholder="e.g., Personal HDFC Card" {...field} value={field.value ?? ''} /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="cardDetails.last4Digits"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Last 4 Digits</FormLabel>
                                                <FormControl><Input placeholder="1234" maxLength={4} {...field} value={field.value ?? ''} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="cardDetails.cardholderName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cardholder Name</FormLabel>
                                                <FormControl><Input placeholder="John Doe" {...field} value={field.value ?? ''} /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="cardDetails.expiryMonth"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Expiry Month</FormLabel>
                                                    <FormControl><Input type="number" min="1" max="12" placeholder="MM" {...field} value={field.value ?? ''} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="cardDetails.expiryYear"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Expiry Year</FormLabel>
                                                    <FormControl><Input type="number" placeholder="YYYY" {...field} value={field.value ?? ''} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="cardDetails.network"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Card Network</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select network..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="visa">Visa</SelectItem>
                                                        <SelectItem value="mastercard">Mastercard</SelectItem>
                                                        <SelectItem value="amex">American Express</SelectItem>
                                                        <SelectItem value="discover">Discover</SelectItem>
                                                        <SelectItem value="rupay">RuPay</SelectItem>
                                                        <SelectItem value="other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />

                                </CollapsibleContent>
                            </Collapsible>
                        )}


                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditMode ? "Save Changes" : "Save Account"}
                        </Button>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}
