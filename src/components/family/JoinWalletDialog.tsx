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
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useFirestore, useUser, commitBatchNonBlocking } from '@/firebase';
import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { FamilyInvite } from '@/lib/types';

const joinSchema = z.object({
  code: z.string().min(4, 'Enter a valid invite code.').max(20),
});

type JoinFormData = z.infer<typeof joinSchema>;

export function JoinWalletDialog({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();

    const form = useForm<JoinFormData>({
        resolver: zodResolver(joinSchema),
        defaultValues: {
            code: '',
        },
    });

    async function onSubmit(values: JoinFormData) {
        if (!firestore || !user) return;
        setIsLoading(true);

        try {
            // 1. Direct lookup of the invite code
            const inviteRef = doc(firestore, 'invites', values.code);
            const inviteSnap = await getDoc(inviteRef);

            if (!inviteSnap.exists()) {
                toast({ variant: 'destructive', title: 'Invalid Code', description: 'The invite code you entered does not exist.' });
                setIsLoading(false);
                return;
            }

            const inviteData = inviteSnap.data() as FamilyInvite;
            
            // Check expiry
            if (inviteData.expiresAt.toDate() < new Date()) {
                toast({ variant: 'destructive', title: 'Expired Code', description: 'This invite code has expired.' });
                setIsLoading(false);
                return;
            }

            const walletId = inviteData.walletId;

            const batch = writeBatch(firestore);

            // 2. Create membership (Source of Truth)
            const memberRef = doc(firestore, `familyWallets/${walletId}/members`, user.uid);
            batch.set(memberRef, {
                userId: user.uid,
                role: inviteData.role || 'member',
                displayName: user.displayName || 'Member',
                joinedAt: serverTimestamp(),
            });

            // 3. Create discovery index
            const membershipIndexRef = doc(firestore, `users/${user.uid}/memberships`, walletId);
            batch.set(membershipIndexRef, {
                walletId: walletId,
                walletName: inviteData.walletName || 'Family Wallet',
                joinedAt: serverTimestamp(),
            });

            // 4. Optionally delete code if it's one-time use (future implementation)
            // For now, we'll keep it simple

            await commitBatchNonBlocking(batch, `familyWallets/${walletId}`);
            
            toast({ title: 'Joined Successfully', description: `You now have access to "${inviteData.walletName}".` });
            setOpen(false);
            form.reset();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Join Failed', description: 'An error occurred while joining the wallet.' });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="rounded-[24px]">
                <DialogHeader>
                    <DialogTitle className="font-headline text-xl">Join Family Wallet</DialogTitle>
                    <DialogDescription>
                        Enter the invite code shared with you to access a shared ledger.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Invite Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter code here..." className="h-12 rounded-xl bg-muted/30 border-none font-mono text-center text-lg tracking-widest uppercase" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">Cancel</Button>
                            <Button type="submit" disabled={isLoading} className="rounded-xl px-8">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Join Wallet'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
