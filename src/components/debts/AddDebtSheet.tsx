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
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input, InputProps } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DateTimePicker } from '@/components/DateTimePicker';
import React from 'react';

const debtSchema = z.object({
  personName: z.string().min(1, 'Person\'s name is required.'),
  amount: z.coerce.number().positive('Amount must be positive.'),
  type: z.enum(['lent', 'borrowed']),
  description: z.string().optional(),
  date: z.date({ required_error: 'A date is required.' }),
});

type DebtFormData = z.infer<typeof debtSchema>;

interface AddDebtDialogProps {
    children?: React.ReactNode;
    personName?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

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


function DebtForm({ form, onSubmit, isLoading, personName }: { form: any, onSubmit: (values: DebtFormData) => void, isLoading: boolean, personName?: string }) {
     const transactionType = form.watch('type');
     
     return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2">
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
                                    <Label className={cn("flex flex-col items-center justify-center rounded-xl border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-sm cursor-pointer transition-all", field.value === 'lent' ? "border-destructive text-destructive bg-destructive/5" : "border-muted")}>
                                        <RadioGroupItem value="lent" className="sr-only" />
                                        <ArrowLeft className="h-5 w-5 mb-1" />
                                        <span className="font-bold">You Gave</span>
                                    </Label>
                                </FormItem>
                                <FormItem>
                                    <Label className={cn("flex flex-col items-center justify-center rounded-xl border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-sm cursor-pointer transition-all", field.value === 'borrowed' ? "border-primary text-primary bg-primary/5" : "border-muted")}>
                                        <RadioGroupItem value="borrowed" className="sr-only" />
                                        <ArrowRight className="h-5 w-5 mb-1" />
                                        <span className="font-bold">You Got</span>
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
                    name="date"
                    render={({ field }) => (
                        <FormItem>
                            <Label className="text-xs text-muted-foreground px-1 mb-1 block uppercase font-bold tracking-widest">Transaction Date</Label>
                            <DateTimePicker field={field} />
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {!personName && (
                    <FormField
                        control={form.control}
                        name="personName"
                        render={({ field }) => (
                            <FormItem>
                                <FloatingLabelInput
                                    label="Person's Name *"
                                    id="personName"
                                    {...field}
                                    value={field.value || ''}
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                             <FloatingLabelInput
                                label="Amount *"
                                id="amount"
                                type="number"
                                {...field}
                                value={field.value ?? ''}
                                className={cn(
                                    'font-bold text-lg',
                                    transactionType === 'lent' && 'text-destructive',
                                    transactionType === 'borrowed' && 'text-primary'
                                )}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                           <FloatingLabelInput
                                label="Remark (Optional)"
                                id="description"
                                {...field}
                                value={field.value || ''}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter className="pt-4 flex flex-row justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => form.handleCancel()} className="flex-1 rounded-xl">Cancel</Button>
                    <Button type="submit" disabled={isLoading} className="flex-1 rounded-xl">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Record"}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
     );
}

export function AddDebtDialog({ children, personName, open: externalOpen, onOpenChange: externalOnOpenChange }: AddDebtDialogProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    
    const [internalOpen, setInternalOpen] = useState(false);

    const isControlled = externalOpen !== undefined && externalOnOpenChange !== undefined;
    const open = isControlled ? externalOpen : internalOpen;
    const onOpenChange = isControlled ? externalOnOpenChange : setInternalOpen;


    const form = useForm<DebtFormData>({
        resolver: zodResolver(debtSchema),
        defaultValues: {
            personName: personName || '',
            amount: '' as any,
            type: 'lent',
            description: '',
            date: new Date(),
        },
    });

    (form as any).handleCancel = () => onOpenChange(false);
    
    useEffect(() => {
        if(open) {
            form.reset({
                personName: personName || '',
                amount: '' as any,
                type: 'lent',
                description: '',
                date: new Date(),
            });
        }
    }, [open, form, personName]);

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
            
            toast({ title: 'Record Saved' });
            onOpenChange(false);

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Could Not Save Record' });
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {children && <DialogTrigger asChild>{children}</DialogTrigger>}
            <DialogContent 
                className="sm:max-w-md rounded-[24px]"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onInteractOutside={(e) => {
                    e.preventDefault();
                }}
            >
                <DialogHeader>
                    <DialogTitle className="font-headline">Add Debt Record</DialogTitle>
                    <DialogDescription>
                        Track money movements between you and others.
                    </DialogDescription>
                </DialogHeader>
                <DebtForm form={form} onSubmit={onSubmit} isLoading={isLoading} personName={personName} />
            </DialogContent>
        </Dialog>
    );
}
