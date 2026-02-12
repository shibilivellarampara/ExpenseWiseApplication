
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useFirestore, useUser, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Asset, AssetType, EnrichedAsset } from '@/lib/types';
import { ASSET_TYPES } from '@/lib/assets';
import { DateTimePicker } from '@/components/DateTimePicker';
import React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// Helper to handle empty strings in numeric fields
const coerceOptionalNumber = (schema: z.ZodNumber) => 
    z.preprocess((val) => (val === "" || val === null || val === undefined ? undefined : val), schema.optional());

const assetSchema = z.object({
  name: z.string().min(1, 'Asset name is required.'),
  assetType: z.enum(Object.keys(ASSET_TYPES) as [AssetType, ...AssetType[]]),
  investedAmount: coerceOptionalNumber(z.coerce.number().positive()),
  currentValue: coerceOptionalNumber(z.coerce.number().positive()),
  quantity: coerceOptionalNumber(z.coerce.number()),
  startDate: z.date().optional().nullable(),
  notes: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

interface AddAssetDialogProps {
    children: React.ReactNode;
    assetToEdit?: EnrichedAsset;
    initialAssetType?: AssetType;
    onSaveSuccess?: () => void;
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

function AssetForm({ form, onSubmit, isLoading, isEditMode, onCancel }: { form: any; onSubmit: (values: AssetFormData) => void; isLoading: boolean; isEditMode: boolean; onCancel: () => void }) {
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                    control={form.control}
                    name="assetType"
                    render={({ field }) => (
                        <FormItem>
                            <FloatingLabelSelect
                                label="Asset Type *"
                                id="assetType"
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={isEditMode}
                            >
                                {Object.entries(ASSET_TYPES).filter(([key]) => key !== 'savings_cash').map(([key, { label }]) => (
                                     <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
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
                                label="Asset Name *"
                                id="name"
                                {...field}
                                value={field.value ?? ''}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="investedAmount"
                        render={({ field }) => (
                            <FormItem>
                                <FloatingLabelInput
                                    label="Invested Amount"
                                    id="investedAmount"
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    value={field.value ?? ''}
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="currentValue"
                        render={({ field }) => (
                            <FormItem>
                                <FloatingLabelInput
                                    label="Current Value"
                                    id="currentValue"
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    value={field.value ?? ''}
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                 <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                            <FloatingLabelInput
                                label="Quantity"
                                id="quantity"
                                type="number"
                                step="0.001"
                                {...field}
                                value={field.value ?? ''}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                        <FormItem>
                            <Label className="text-xs text-muted-foreground mb-1 block px-1">Start Date</Label>
                            <DateTimePicker field={field} />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <Label className="text-xs text-muted-foreground mb-1 block px-1">Notes</Label>
                            <FormControl>
                                <Textarea placeholder="Any additional notes about this asset..." {...field} value={field.value ?? ''} className="min-h-[100px]" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter className="pt-4 flex flex-row gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">Cancel</Button>
                    <Button type="submit" disabled={isLoading} className="flex-1 sm:flex-none min-w-[100px]">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditMode ? "Save Changes" : "Save Asset"}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

export function AddAssetDialog({ children, assetToEdit, initialAssetType, onSaveSuccess }: AddAssetDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const isEditMode = !!assetToEdit;

    const form = useForm<AssetFormData>({
        resolver: zodResolver(assetSchema),
        defaultValues: {
            name: '',
            assetType: initialAssetType || 'mutual_funds',
            investedAmount: undefined,
            currentValue: undefined,
            quantity: undefined,
            startDate: undefined,
            notes: '',
        },
    });

    useEffect(() => {
        if(open) {
            if (isEditMode && assetToEdit) {
                 form.reset({
                    name: assetToEdit.name,
                    assetType: assetToEdit.assetType,
                    investedAmount: assetToEdit.investedAmount || undefined,
                    currentValue: assetToEdit.currentValue || undefined,
                    quantity: assetToEdit.quantity || undefined,
                    startDate: assetToEdit.startDate,
                    notes: assetToEdit.notes || '',
                });
            } else {
                form.reset({
                    name: '',
                    assetType: initialAssetType || 'mutual_funds',
                    investedAmount: undefined,
                    currentValue: undefined,
                    quantity: undefined,
                    startDate: null,
                    notes: '',
                });
            }
        }
    }, [open, form, isEditMode, assetToEdit, initialAssetType]);

    async function onSubmit(values: AssetFormData) {
        setIsLoading(true);
        if (!firestore || !user) {
             toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
             setIsLoading(false);
             return;
        }

        // Logic for amount fallbacks
        let finalInvested = values.investedAmount || 0;
        let finalCurrent = values.currentValue || 0;

        if (values.investedAmount && !values.currentValue) {
            finalCurrent = values.investedAmount;
        } else if (values.currentValue && !values.investedAmount) {
            finalInvested = values.currentValue;
        }

        const assetData = {
            ...values,
            userId: user.uid,
            investedAmount: finalInvested,
            currentValue: finalCurrent,
            lastUpdated: serverTimestamp(),
        };
    
        try {
            if (isEditMode && assetToEdit) {
                const assetRef = doc(firestore, `users/${user.uid}/assets`, assetToEdit.id);
                await setDocumentNonBlocking(assetRef, assetData, { merge: true });
                toast({ title: 'Asset Updated!', description: 'Your asset details have been saved.' });
            } else {
                const assetsCollectionRef = collection(firestore, `users/${user.uid}/assets`);
                await addDocumentNonBlocking(assetsCollectionRef, assetData);
                toast({ title: 'Asset Added!', description: 'The new asset has been created.' });
            }
            onSaveSuccess?.();
            setOpen(false);
    
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Could Not Save Asset', description: "There was an unexpected error. Please try again." });
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="font-headline">{isEditMode ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'Update the details for your asset.' : 'Add a new asset to track its value.'}
                    </DialogDescription>
                </DialogHeader>
                <AssetForm form={form} onSubmit={onSubmit} isLoading={isLoading} isEditMode={isEditMode} onCancel={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}
