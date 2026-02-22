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
import { useState } from 'react';
import { useFirestore, useUser, commitBatchNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

const walletSchema = z.object({
  name: z.string().min(1, 'Wallet name is required.').max(50),
  description: z.string().max(200).optional(),
});

type WalletFormData = z.infer<typeof walletSchema>;

export function CreateWalletDialog({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();

    const form = useForm<WalletFormData>({
        resolver: zodResolver(walletSchema),
        defaultValues: {
            name: '',
            description: '',
        },
    });

    async function onSubmit(values: WalletFormData) {
        if (!firestore || !user) return;
        setIsLoading(true);

        try {
            const batch = writeBatch(firestore);
            const walletRef = doc(collection(firestore, 'familyWallets'));
            const walletId = walletRef.id;

            // 1. Create root wallet document
            batch.set(walletRef, {
                id: walletId,
                name: values.name,
                description: values.description || '',
                ownerId: user.uid,
                createdAt: serverTimestamp(),
            });

            // 2. Create the owner membership (Source of Truth)
            const memberRef = doc(firestore, `familyWallets/${walletId}/members`, user.uid);
            batch.set(memberRef, {
                userId: user.uid,
                role: 'owner',
                displayName: user.displayName || 'Owner',
                joinedAt: serverTimestamp(),
            });

            // 3. Create user membership entry (Discovery Index)
            const membershipIndexRef = doc(firestore, `users/${user.uid}/memberships`, walletId);
            batch.set(membershipIndexRef, {
                walletId: walletId,
                walletName: values.name,
                joinedAt: serverTimestamp(),
            });

            await commitBatchNonBlocking(batch, `familyWallets/${walletId}`);
            
            toast({ title: 'Wallet Created', description: `"${values.name}" is ready for use.` });
            setOpen(false);
            form.reset();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not create family wallet.' });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="rounded-[24px]">
                <DialogHeader>
                    <DialogTitle className="font-headline text-xl">Create Family Wallet</DialogTitle>
                    <DialogDescription>
                        Set up a shared space to manage finances with your family.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Wallet Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. My Family Ledger" className="h-12 rounded-xl bg-muted/30 border-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="What is this wallet for?" 
                                            className="rounded-xl bg-muted/30 border-none min-h-[100px]" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">Cancel</Button>
                            <Button type="submit" disabled={isLoading} className="rounded-xl px-8">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create Wallet'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
