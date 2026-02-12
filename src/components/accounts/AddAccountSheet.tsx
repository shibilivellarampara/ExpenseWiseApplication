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
import { Button } from '../ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '../ui/form';
import { Input, InputProps } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase, commitBatchNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc as setDocFirestore, writeBatch } from 'firebase/firestore';
import { Loader2, Pilcrow, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { availableIcons } from '@/lib/defaults';
import * as LucideIcons from 'lucide-react';
import { Account } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '../ui/scroll-area';
import React from 'react';

// Helper to handle empty strings in numeric fields
const coerceOptionalNumber = (schema: z.ZodNumber) => 
    z.preprocess((val) => (val === "" || val === null || val === undefined ? undefined : val), schema.optional());

const cardDetailsSchema = z.object({
    cardNickname: z.string().optional(),
    last4Digits: z.string().length(4, "Must be 4 digits").optional().or(z.literal('')),
    cardholderName: z.string().optional(),
    expiryMonth: coerceOptionalNumber(z.coerce.number().min(1).max(12)),
    expiryYear: coerceOptionalNumber(z.coerce.number().min(new Date().getFullYear()).max(new Date().getFullYear() + 20)),
    network: z.enum(['visa', 'mastercard', 'amex', 'discover', 'rupay', 'other']).optional(),
    statementDate: coerceOptionalNumber(z.coerce.number().min(1).max(31)),
});

const accountSchemaBase = z.object({
    name: z.string().min(1, 'Account name is required.'),
    type: z.enum(['bank', 'credit_card', 'wallet', 'cash']),
    balance: z.coerce.number().step(0.01),
    limit: coerceOptionalNumber(z.coerce.number().positive()),
    billingDate: coerceOptionalNumber(z.coerce.number().min(1).max(31)),
    icon: z.string().min(1, "Icon is required."),
    status: z.enum(['active', 'inactive']).default('active'),
    cardDetails: cardDetailsSchema.optional(),
});

const accountSchema = accountSchemaBase.refine(data => {
    if (data.type !== 'credit_card') return true;
    return true;
}, {
    message: "Check limit settings.",
    path: ["limit"],
});

type AccountFormData = z.infer<typeof accountSchema>;

const FloatingLabelInput = React.forwardRef<HTMLInputElement, InputProps & { label: string }>(
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
                <Label
                    htmlFor={id}
                    className={cn(
                        "absolute left-3 text-muted-foreground transition-all bg-background px-1 pointer-events-none",
                         "top-1/2 -translate-y-1/2 text-base peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:font-medium",
                         "peer-data-[has-value=true]:top-0 peer-data-[has-value=true]:-translate-y-1/2 peer-data-[has-value=true]:text-xs peer-data-[has-value=true]:font-medium"
                    )}
                >
                    {label}
                </Label>
            </div>
        );
    }
);
FloatingLabelInput.displayName = 'FloatingLabelInput';

const FloatingLabelSelect = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof SelectTrigger> & { label: string; children: React.ReactNode; onValueChange: (value: string) => void; value?: string }>(
    ({ className, label, id, children, onValueChange, value, ...props }, ref) => {
        const hasValue = !!value;
        return (
            <div className="relative">
                 <Select onValueChange={onValueChange} value={value}>
                    <SelectTrigger ref={ref} id={id} className={cn("peer h-14 pt-4 text-base floating-input", className)} data-has-value={hasValue} {...props}>
                        <SelectValue placeholder=" "/>
                    </SelectTrigger>
                    <SelectContent>
                        {children}
                    </SelectContent>
                </Select>
                 <Label
                    htmlFor={id}
                     className={cn(
                        "absolute left-3 text-muted-foreground transition-all bg-background px-1 pointer-events-none",
                        "top-1/2 -translate-y-1/2 text-base peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:font-medium",
                        hasValue && "top-0 -translate-y-1/2 text-xs font-medium"
                    )}
                >
                    {label}
                </Label>
            </div>
        )
    }
);
FloatingLabelSelect.displayName = 'FloatingLabelSelect';

function AccountForm({ form, onSubmit, onCancel, isLoading, isEditMode }: { form: any, onSubmit: (values: AccountFormData) => void, onCancel: () => void, isLoading: boolean, isEditMode: boolean }) {
    const accountType = form.watch('type');
    const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
    
    const renderIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="h-5 w-5" /> : <Pilcrow className="h-5 w-5" />;
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                            <FloatingLabelSelect
                                label="Account Type *"
                                id="type"
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={isEditMode}
                            >
                                <SelectItem value="bank">Bank Account</SelectItem>
                                <SelectItem value="credit_card">Credit Card</SelectItem>
                                <SelectItem value="wallet">Digital Wallet</SelectItem>
                                <SelectItem value="cash">Cash</SelectItem>
                            </FloatingLabelSelect>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FloatingLabelInput
                                label="Account Name *"
                                id="name"
                                {...field}
                                value={field.value ?? ''}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                        <FormItem>
                            <Label className="text-xs text-muted-foreground mb-1 block px-1">Account Icon *</Label>
                            <FormControl>
                                 <Popover open={iconPopoverOpen} onOpenChange={setIconPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start h-12">
                                            {renderIcon(field.value)}
                                            <span className="ml-2">{field.value}</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <ScrollArea className="h-72">
                                            <div className="grid grid-cols-5 gap-2 p-4">
                                                {availableIcons.map(icon => (
                                                    <Button key={icon} variant="ghost" size="icon" onClick={() => {field.onChange(icon); setIconPopoverOpen(false);}}>
                                                        {renderIcon(icon)}
                                                    </Button>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </PopoverContent>
                                </Popover>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="balance"
                    render={({ field }) => (
                        <FormItem>
                            <FloatingLabelInput
                                label={accountType === 'credit_card' ? 'Current Outstanding Amount *' : 'Initial Balance *'}
                                id="balance"
                                type="number"
                                step="0.01"
                                {...field}
                                value={field.value ?? ''}
                                disabled={isEditMode}
                            />
                            {!isEditMode && accountType !== 'credit_card' && (
                                <FormDescription className="text-xs px-1">
                                    An initial transaction will be created for this amount.
                                </FormDescription>
                            )}
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
                                <FloatingLabelInput
                                    label="Credit Limit"
                                    id="limit"
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    value={field.value ?? ''}
                                    disabled={isEditMode}
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                {accountType === 'credit_card' && (
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="cardDetails.statementDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FloatingLabelInput
                                        label="Stmt Date (Day)"
                                        id="statementDate"
                                        type="number"
                                        min="1"
                                        max="31"
                                        {...field}
                                        value={field.value ?? ''}
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="billingDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FloatingLabelInput
                                        label="Due Date (Day)"
                                        id="billingDate"
                                        type="number"
                                        min="1"
                                        max="31"
                                        {...field}
                                        value={field.value ?? ''}
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}

                {accountType === 'credit_card' && (
                     <Collapsible>
                        <CollapsibleTrigger asChild>
                            <Button variant="link" className="p-0 h-auto flex items-center gap-1 text-xs">
                                <ChevronDown className="h-3 w-3" />
                                Card Display Details (Optional)
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
                                        <FloatingLabelInput label="Last 4 Digits" id="last4" maxLength={4} {...field} value={field.value ?? ''} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="cardDetails.cardholderName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FloatingLabelInput label="Cardholder Name" id="chName" {...field} value={field.value ?? ''} />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="cardDetails.expiryMonth"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FloatingLabelInput label="Exp Month" id="expM" type="number" min="1" max="12" {...field} value={field.value ?? ''} />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="cardDetails.expiryYear"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FloatingLabelInput label="Exp Year" id="expY" type="number" {...field} value={field.value ?? ''} />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="cardDetails.network"
                                render={({ field }) => (
                                    <FormItem>
                                        <FloatingLabelSelect
                                            label="Card Network"
                                            id="network"
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
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

                <DialogFooter className="pt-4 flex flex-row gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">Cancel</Button>
                    <Button type="submit" disabled={isLoading} className="flex-1 sm:flex-none min-w-[100px]">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditMode ? "Save" : "Add"}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

export function AddAccountSheet({ children, accountToEdit }: { children: React.ReactNode; accountToEdit?: Account }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const isEditMode = !!accountToEdit;
    
    const accountsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/accounts`) : null, [user, firestore]);
    const { data: accounts } = useCollection<Account>(accountsQuery);

    const form = useForm<AccountFormData>({
        resolver: zodResolver(accountSchema.refine(
            (data) => {
                if (isEditMode && accountToEdit?.name === data.name) return true;
                return !accounts?.some(acc => acc.name.toLowerCase() === data.name.toLowerCase());
            },
            { message: "Account name already exists.", path: ["name"] }
        )),
        defaultValues: {
            name: '',
            type: 'bank',
            balance: '' as any,
            icon: 'Landmark',
            limit: '' as any,
            billingDate: '' as any,
            status: 'active',
            cardDetails: { cardNickname: '', last4Digits: '', cardholderName: '', expiryMonth: '' as any, expiryYear: '' as any, network: undefined, statementDate: '' as any }
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
                    balance: '' as any,
                    icon: 'Landmark',
                    limit: '' as any,
                    billingDate: '' as any,
                    status: 'active',
                    cardDetails: { cardNickname: '', last4Digits: '', cardholderName: '', expiryMonth: '' as any, expiryYear: '' as any, network: undefined, statementDate: '' as any }
                });
            }
        }
    }, [open, form, isEditMode, accountToEdit]);

    async function onSubmit(values: AccountFormData) {
        setIsLoading(true);
        if (!firestore || !user) {
             toast({ variant: 'destructive', title: 'Error', description: 'Authentication not ready.' });
             setIsLoading(false);
             return;
        }
    
        const accountData: any = { ...values };
        delete accountData.balance;

        // Auto-calculate billingDate (Due Date) if empty for credit cards (Stmt Date + 15 days)
        if (values.type === 'credit_card' && !values.billingDate && values.cardDetails?.statementDate) {
            accountData.billingDate = ((values.cardDetails.statementDate + 15 - 1) % 31) + 1;
        }
    
        if (accountData.cardDetails) {
            const cleaned: any = {};
            for (const key in accountData.cardDetails) {
                const val = accountData.cardDetails[key];
                if (val !== undefined && val !== null && val !== '' && !Number.isNaN(val)) cleaned[key] = val;
            }
            accountData.cardDetails = Object.keys(cleaned).length > 0 ? cleaned : undefined;
        }
    
        if (values.type !== 'credit_card') {
            delete accountData.limit;
            delete accountData.billingDate;
            delete accountData.cardDetails;
        }
    
        try {
            if (isEditMode && accountToEdit) {
                const accountRef = doc(firestore, `users/${user.uid}/accounts`, accountToEdit.id);
                await setDocFirestore(accountRef, accountData, { merge: true });
                toast({ title: 'Account Updated' });
            } else {
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
 
                 if (values.type !== 'credit_card' && values.balance) {
                     const initialTxRef = doc(collection(firestore, `users/${user.uid}/expenses`));
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
                 await commitBatchNonBlocking(batch, `users/${user.uid}/accounts`);
                 toast({ title: 'Account Added' });
            }
            setOpen(false);
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not save account details.' });
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="font-headline">{isEditMode ? 'Edit Account' : 'New Account'}</DialogTitle>
                    <DialogDescription>
                        Fill in the details for your financial account.
                    </DialogDescription>
                </DialogHeader>
                <AccountForm form={form} onSubmit={onSubmit} onCancel={() => setOpen(false)} isLoading={isLoading} isEditMode={isEditMode}/>
            </DialogContent>
        </Dialog>
    );
}
