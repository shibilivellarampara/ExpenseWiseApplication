

'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input, InputProps } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DateTimePicker } from '@/components/DateTimePicker';
import { useMediaQuery } from '@/hooks/use-media-query';
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
    children: React.ReactNode;
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


function DebtForm({ form, onSubmit, isLoading, personName, onCancel }: { form: any; onSubmit: (values: DebtFormData) => void; isLoading: boolean; personName?: string; onCancel: () => void }) {
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
                                    <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base", field.value === 'lent' ? "border-red-500 text-red-500" : "border-muted")}>
                                        <RadioGroupItem value="lent" className="sr-only" />
                                        <ArrowLeft className="h-5 w-5 mb-1" />
                                        <span>You Gave</span>
                                    </Label>
                                </FormItem>
                                <FormItem>
                                    <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base", field.value === 'borrowed' ? "border-green-600 text-green-600" : "border-muted")}>
                                        <RadioGroupItem value="borrowed" className="sr-only" />
                                        <ArrowRight className="h-5 w-5 mb-1" />
                                        <span>You Got</span>
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
                        <FormItem className="flex flex-col">
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
                                    'font-bold',
                                    transactionType === 'lent' && 'text-red-500',
                                    transactionType === 'borrowed' && 'text-green-600'
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
                                label="Description"
                                id="description"
                                {...field}
                                value={field.value || ''}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <DialogFooter className="pt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isLoading}>
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
    
    // Internal state for uncontrolled component
    const [internalOpen, setInternalOpen] = useState(false);

    // Determine if the component is controlled or uncontrolled
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
            
            toast({
                title: 'Record Added!',
                description: 'Your debt/due has been recorded.',
            });
            onOpenChange(false);

        } catch (error: any) {
            let description = "There was an unexpected error. Please try again.";
            if (error.message.includes("invalid data")) {
                description = "Some of the data you entered is invalid. Please check all fields and try again.";
            }
             toast({ variant: 'destructive', title: 'Could Not Save Record', description });
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-headline">Add {personName ? `for ${personName}` : 'Debt or Due'}</DialogTitle>
                    <DialogDescription>
                        Track money you've lent to others or borrowed from them.
                    </DialogDescription>
                </DialogHeader>
                <DebtForm form={form} onSubmit={onSubmit} isLoading={isLoading} personName={personName} onCancel={() => onOpenChange(false)}/>
            </DialogContent>
        </Dialog>
    );
}
