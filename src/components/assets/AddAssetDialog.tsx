
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useFirestore, useUser, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Asset, AssetType, EnrichedAsset } from '@/lib/types';
import { ASSET_TYPES } from '@/lib/assets';
import { DateTimePicker } from '../DateTimePicker';

const assetSchema = z.object({
  name: z.string().min(1, 'Asset name is required.'),
  assetType: z.enum(Object.keys(ASSET_TYPES) as [AssetType, ...AssetType[]]),
  investedAmount: z.coerce.number().min(0, "Invested amount cannot be negative."),
  currentValue: z.coerce.number().min(0, "Current value cannot be negative."),
  quantity: z.coerce.number().optional(),
  startDate: z.date().optional(),
  maturityDate: z.date().optional(),
  notes: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

interface AddAssetDialogProps {
    children: React.ReactNode;
    assetToEdit?: EnrichedAsset;
    onSaveSuccess?: () => void;
}

export function AddAssetDialog({ children, assetToEdit, onSaveSuccess }: AddAssetDialogProps) {
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
            assetType: 'savings_cash',
            investedAmount: undefined,
            currentValue: undefined,
            quantity: undefined,
            startDate: undefined,
            maturityDate: undefined,
            notes: '',
        },
    });

    useEffect(() => {
        if(open) {
            if (isEditMode && assetToEdit) {
                 form.reset({
                    name: assetToEdit.name,
                    assetType: assetToEdit.assetType,
                    investedAmount: assetToEdit.investedAmount,
                    currentValue: assetToEdit.currentValue,
                    quantity: assetToEdit.quantity,
                    startDate: assetToEdit.startDate,
                    maturityDate: assetToEdit.maturityDate,
                    notes: assetToEdit.notes,
                });
            } else {
                form.reset({
                    name: '',
                    assetType: 'savings_cash',
                    investedAmount: undefined,
                    currentValue: undefined,
                    quantity: undefined,
                    startDate: undefined,
                    maturityDate: undefined,
                    notes: '',
                });
            }
        }
    }, [open, form, isEditMode, assetToEdit]);

    async function onSubmit(values: AssetFormData) {
        setIsLoading(true);
        if (!firestore || !user) {
             toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
             setIsLoading(false);
             return;
        }

        const assetData = {
            ...values,
            userId: user.uid,
            lastUpdated: serverTimestamp(),
        };
    
        try {
            if (isEditMode && assetToEdit) {
                const assetRef = collection(firestore, `users/${user.uid}/assets`);
                await setDocumentNonBlocking(doc(assetRef, assetToEdit.id), assetData, { merge: true });
                toast({ title: 'Asset Updated!', description: 'Your asset details have been saved.' });
            } else {
                const newAssetRef = collection(firestore, `users/${user.uid}/assets`);
                await addDocumentNonBlocking(newAssetRef, assetData);
                toast({ title: 'Asset Added!', description: 'The new asset has been created.' });
            }
            onSaveSuccess?.();
            setOpen(false);
    
        } catch (error: any) {
            let description = "There was an unexpected error. Please try again.";
             toast({ variant: 'destructive', title: 'Could Not Save Asset', description });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-headline">{isEditMode ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'Update the details for your asset.' : 'Add a new asset to track its value.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
                        <FormField
                            control={form.control}
                            name="assetType"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Asset Type *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an asset type" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {Object.entries(ASSET_TYPES).map(([key, { label }]) => (
                                             <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Asset Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., HDFC Bank Savings" {...field} />
                                    </FormControl>
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
                                        <FormLabel>Invested Amount *</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="10000" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="currentValue"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current Value *</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="12000" {...field} />
                                        </FormControl>
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
                                    <FormLabel>Quantity</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.001" placeholder="e.g., 10 (for stocks)" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Start Date</FormLabel>
                                        <DateTimePicker field={field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="maturityDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Maturity Date</FormLabel>
                                        <DateTimePicker field={field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Any additional notes about this asset..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <DialogFooter className="pt-4 sticky bottom-0 bg-background/90 pb-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditMode ? "Save Changes" : "Save Asset"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
