

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

import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input, InputProps } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, forwardRef } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc as setDocFirestore, writeBatch } from 'firebase/firestore';
import { Loader2, Pilcrow, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { availableIcons } from '@/lib/defaults';
import * as LucideIcons from 'lucide-react';
import { Account, Category, CardDetails } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useMediaQuery } from '@/hooks/use-media-query';
import React from 'react';

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
    balance: z.coerce.number({invalid_type_error: "Please enter a valid amount"}).step(0.01).optional(),
    limit: z.coerce.number().optional(),
    billingDate: z.coerce.number().min(1).max(31).optional(),
    icon: z.string().min(1, "Icon is required."),
    status: z.enum(['active', 'inactive']).default('active'),
    cardDetails: cardDetailsSchema.optional(),
});

const accountSchema = accountSchemaBase.refine(data => {
    if (data.type !== 'credit_card') return true;
    if (data.balance && data.balance > 0) {
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

const FloatingLabelInput = forwardRef<HTMLInputElement, InputProps & { label: string }>(
    ({ className, label, id, ...props }, ref) => {
        const hasValue = props.value !== undefined && props.value !== null && String(props.value) !== '';
        return (
            <div className="relative">
                <Input
                    ref={ref}
                    id={id}
                    placeholder=" "
                    className={cn("peer h-14 pt-5 text-base floating-input", className)}
                    data-has-value={hasValue}
                    {...props}
                />
                <FormLabel
                    htmlFor={id}
                    className={cn(
                        "absolute left-3 text-muted-foreground transition-all bg-background px-1 pointer-events-none",
                         "top-1/2 -translate-y-1/2 text-base peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:font-medium",
                         "peer-data-[has-value=true]:top-0 peer-data-[has-value=true]:-translate-y-1/2 peer-data-[has-value=true]:text-xs peer-data-[has-value=true]:font-medium"
                    )}
                >
                    {label}
                </FormLabel>
            </div>
        );
    }
);
FloatingLabelInput.displayName = 'FloatingLabelInput';

const FloatingLabelSelect = forwardRef<HTMLButtonElement, React.ComponentProps<typeof SelectTrigger> & { label: string; children: React.ReactNode; onValueChange: (value: string) => void; value?: string }>(
    ({ className, label, id, children, onValueChange, value, ...props }, ref) => {
        const hasValue = !!value;
        return (
            <div className="relative">
                 <Select onValueChange={onValueChange} value={value}>
                    <SelectTrigger ref={ref} id={id} className={cn("peer h-14 pt-4 text-base floating-input", className)} data-has-value={hasValue} {...props}>
                        <div className="flex items-center gap-2">
                            {value && (
                                <div className="flex items-center gap-2">
                                    {(value === 'bank' || value === 'credit_card' || value === 'wallet' || value === 'cash') && (
                                         <LucideIcons.Landmark className="h-4 w-4" />
                                    )}
                                    <SelectValue placeholder=" "/>
                                </div>
                            )}
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        {children}
                    </SelectContent>
                </Select>
                 <FormLabel
                    htmlFor={id}
                     className={cn(
                        "absolute left-3 text-muted-foreground transition-all bg-background px-1 pointer-events-none",
                        "top-1/2 -translate-y-1/2 text-base peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:font-medium",
                        hasValue && "top-0 -translate-y-1/2 text-xs font-medium"
                    )}
                >
                    {label}
                </FormLabel>
            </div>
        )
    }
);
FloatingLabelSelect.displayName = 'FloatingLabelSelect';

function AccountForm({ form, onSubmit, isLoading, isEditMode, onCancel }: { form: any, onSubmit: (values: AccountFormData) => void, isLoading: boolean, isEditMode: boolean, onCancel: () => void }) {
    const accountType = form.watch('type');
    const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
    
    const renderIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="h-5 w-5" /> : <Pilcrow className="h-5 w-5" />;
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                             <FloatingLabelInput label="Account Name *" id="name" {...field} />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                             <FloatingLabelSelect label="Account Type *" id="type" onValueChange={field.onChange} value={field.value} disabled={isEditMode}>
                                <SelectItem value="bank">
                                    <div className="flex items-center gap-2">
                                        <LucideIcons.Landmark className="h-4 w-4" /> Bank Account
                                    </div>
                                </SelectItem>
                                <SelectItem value="credit_card">
                                     <div className="flex items-center gap-2">
                                        <LucideIcons.CreditCard className="h-4 w-4" /> Credit Card
                                    </div>
                                </SelectItem>
                                <SelectItem value="wallet">
                                     <div className="flex items-center gap-2">
                                        <LucideIcons.Wallet className="h-4 w-4" /> Digital Wallet
                                    </div>
                                </SelectItem>
                                <SelectItem value="cash">
                                     <div className="flex items-center gap-2">
                                        <LucideIcons.HandCoins className="h-4 w-4" /> Cash
                                    </div>
                                </SelectItem>
                             </FloatingLabelSelect>
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
                                    <FloatingLabelInput label="Credit Limit" id="limit" type="number" step="0.01" {...field} value={field.value ?? ''} disabled={isEditMode} />
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
                            <FloatingLabelInput 
                                label={accountType === 'credit_card' ? 'Current Outstanding Amount' : 'Current Balance'} 
                                id="balance" 
                                type="number" 
                                step="0.01" 
                                {...field} 
                                value={field.value ?? ''} 
                                disabled={isEditMode}
                             />
                             {accountType !== 'credit_card' && !isEditMode && <FormMessage>An initial transaction will be created for this amount.</FormMessage>}
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
                                    <FloatingLabelInput label="Statement Date (Day of Month)" id="statementDate" type="number" min="1" max="31" {...field} value={field.value ?? ''}/>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="billingDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FloatingLabelInput label="Payment Due Date (Day of Month)" id="billingDate" type="number" min="1" max="31" {...field} value={field.value ?? ''} />
                                     <FormMessage>Set the day your credit card bill is due.</FormMessage>
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
                                        <FloatingLabelInput label="Card Nickname" id="cardNickname" {...field} value={field.value ?? ''} />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="cardDetails.last4Digits"
                                render={({ field }) => (
                                    <FormItem>
                                        <FloatingLabelInput label="Last 4 Digits" id="last4Digits" maxLength={4} {...field} value={field.value ?? ''} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="cardDetails.cardholderName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FloatingLabelInput label="Cardholder Name" id="cardholderName" {...field} value={field.value ?? ''} />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="cardDetails.expiryMonth"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FloatingLabelInput label="Expiry Month" id="expiryMonth" type="number" min="1" max="12" {...field} value={field.value ?? ''} />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="cardDetails.expiryYear"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FloatingLabelInput label="Expiry Year" id="expiryYear" type="number" {...field} value={field.value ?? ''} />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="cardDetails.network"
                                render={({ field }) => (
                                    <FormItem>
                                         <FloatingLabelSelect label="Card Network" id="network" onValueChange={field.onChange} value={field.value}>
                                            <SelectItem value="visa">Visa</SelectItem>
                                            <SelectItem value="mastercard">Mastercard</SelectItem>
                                            <SelectItem value="amex">American Express</SelectItem>
                                            <SelectItem value="discover">Discover</SelectItem>
                                            <SelectItem value="rupay">RuPay</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                         </FloatingLabelSelect>
                                    </FormItem>
                                )}
                            />

                        </CollapsibleContent>
                    </Collapsible>
                )}
                
                 <DrawerFooter className="pt-4 px-0 flex-row justify-end gap-2 sm:hidden">
                    <DrawerClose asChild>
                        <Button type="button" variant="outline" className="w-24">Cancel</Button>
                    </DrawerClose>
                    <Button type="submit" disabled={isLoading} className="w-28">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditMode ? "Save Changes" : "Save Account"}
                    </Button>
                </DrawerFooter>
                 <DialogFooter className="pt-4 hidden sm:flex">
                    <Button type="button" variant="outline" className="w-24" onClick={onCancel}>Cancel</Button>
                    <Button type="submit" disabled={isLoading} className="w-28">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditMode ? "Save Changes" : "Save Account"}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

export function AddAccountSheet({ children, accountToEdit }: AddAccountSheetProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const isEditMode = !!accountToEdit;
    const isMobile = useMediaQuery("(max-width: 640px)");
    
    const accountsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/accounts`) : null, [user, firestore]);
    const { data: accounts } = useCollection<Account>(accountsQuery);

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
    
    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>{children}</DrawerTrigger>
                <DrawerContent>
                     <DrawerHeader>
                        <DrawerTitle className="font-headline">{isEditMode ? 'Edit Account' : 'Add New Account'}</DrawerTitle>
                        <DrawerDescription>
                            {isEditMode ? 'Update the details for your account.' : 'Create a new account to track your finances.'}
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="overflow-y-auto px-4">
                        <AccountForm form={form} onSubmit={onSubmit} isLoading={isLoading} isEditMode={isEditMode} onCancel={() => setOpen(false)}/>
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="font-headline">{isEditMode ? 'Edit Account' : 'Add New Account'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'Update the details for your account.' : 'Create a new account to track your finances.'}
                    </DialogDescription>
                </DialogHeader>
                <AccountForm form={form} onSubmit={onSubmit} isLoading={isLoading} isEditMode={isEditMode} onCancel={() => setOpen(false)}/>
            </DialogContent>
        </Dialog>
    );
}
