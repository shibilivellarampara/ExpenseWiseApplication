

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
import { Button } from '../ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input, InputProps } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { DateTimePicker } from '../DateTimePicker';
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


const FloatingLabelTextarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'> & { label: string }>(
    ({ className, label, id, ...props }, ref) => {
        const hasValue = props.value !== undefined && props.value !== null && String(props.value) !== '';
        return (
            <div className="relative">
                <Textarea
                    ref={ref}
                    id={id}
                    placeholder=" "
                    className={cn("peer min-h-[90px] pt-5 text-base floating-input", className)}
                     data-has-value={hasValue}
                    {...props}
                />
                <Label
                    htmlFor={id}
                     className={cn(
                        "absolute left-3 text-muted-foreground transition-all bg-background px-1 pointer-events-none",
                         "top-5 -translate-y-1/2 text-base peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:font-medium",
                         "peer-data-[has-value=true]:top-0 peer-data-[has-value=true]:-translate-y-1/2 peer-data-[has-value=true]:text-xs peer-data-[has-value=true]:font-medium"
                    )}
                >
                    {label}
                </Label>
            </div>
        );
    }
);
FloatingLabelTextarea.displayName = 'FloatingLabelTextarea';


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
                                    <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base", field.value === 'lent' ? "border-green-600 text-green-600" : "border-muted")}>
                                        <RadioGroupItem value="lent" className="sr-only" />
                                        <ArrowRight className="h-5 w-5 mb-1" />
                                        <span>Money Out</span>
                                        <span className="text-xs font-normal text-muted-foreground">(You Lent)</span>
                                    </Label>
                                </FormItem>
                                <FormItem>
                                    <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground text-base", field.value === 'borrowed' ? "border-destructive text-destructive" : "border-muted")}>
                                        <RadioGroupItem value="borrowed" className="sr-only" />
                                        <ArrowLeft className="h-5 w-5 mb-1" />
                                        <span>Money In</span>
                                            <span className="text-xs font-normal text-muted-foreground">(You Borrowed)</span>
                                    </Label>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
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
                                    transactionType === 'lent' && 'text-green-600',
                                    transactionType === 'borrowed' && 'text-red-500'
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
                           <FloatingLabelTextarea
                                label="Description"
                                id="description"
                                {...field}
                                value={field.value || ''}
                            />
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
                 <DrawerFooter className="pt-4 px-0 flex-row justify-end gap-2 sm:hidden">
                    <DrawerClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                    </DrawerClose>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Record"}
                    </Button>
                </DrawerFooter>
                 <DialogFooter className="pt-4 hidden sm:flex">
                    <Button type="button" variant="outline" onClick={() => form.handleCancel()}>Cancel</Button>
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
    const isDesktop = useMediaQuery("(min-width: 768px)");
    
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
            
            toast({
                title: 'Record Added!',
                description: 'Your debt/due has been recorded.',
            });
            onOpenChange(false);

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }
    
    if (isDesktop) {
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
                    <DebtForm form={form} onSubmit={onSubmit} isLoading={isLoading} personName={personName} />
                </DialogContent>
            </Dialog>
        );
    }
    
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerTrigger asChild>{children}</DrawerTrigger>
            <DrawerContent>
                 <DrawerHeader className="text-left">
                    <DrawerTitle className="font-headline">Add {personName ? `for ${personName}` : 'Debt or Due'}</DrawerTitle>
                    <DrawerDescription>
                        Track money you've lent to others or borrowed from them.
                    </DrawerDescription>
                </DrawerHeader>
                 <div className="px-4">
                    <DebtForm form={form} onSubmit={onSubmit} isLoading={isLoading} personName={personName}/>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

