
'use client';

import { useState, useMemo } from 'react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, arrayUnion, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { SharedExpense, UserProfile, Tag } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { renderIcon } from '@/lib/render-icon.tsx';

const joinSchema = z.object({
    joinId: z.string().length(6, 'The join code must be 6 characters long.'),
    sharedTagId: z.string().min(1, 'Please select a tag to link your personal expenses.'),
});

type JoinFormData = z.infer<typeof joinSchema>;

export function JoinSharedExpenseDialog({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();

    const tagsQuery = useMemo(() => user ? collection(firestore, `users/${user.uid}/tags`) : null, [user, firestore]);
    const { data: tags, isLoading: tagsLoading } = useCollection<Tag>(tagsQuery);
    const activeTags = useMemo(() => tags?.filter(t => t.status !== 'inactive'), [tags]);

    const form = useForm<JoinFormData>({
        resolver: zodResolver(joinSchema),
        defaultValues: { joinId: '', sharedTagId: '' },
    });

    async function onSubmit(values: JoinFormData) {
        if (!firestore || !user) return;
        setIsLoading(true);

        try {
            const ledgersRef = collection(firestore, 'shared_expenses');
            const q = query(ledgersRef, where('inviteCode', '==', values.joinId.toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                form.setError('joinId', { type: 'manual', message: 'No ledger found with this code.' });
                setIsLoading(false);
                return;
            }

            const ledgerDoc = querySnapshot.docs[0];
            const ledger = ledgerDoc.data() as SharedExpense;

            if (ledger.memberIds.includes(user.uid)) {
                 form.setError('joinId', { type: 'manual', message: 'You are already a member of this ledger.' });
                 setIsLoading(false);
                 return;
            }

            const batch = writeBatch(firestore);
            batch.update(ledgerDoc.ref, { 
                memberIds: arrayUnion(user.uid),
                [`memberSharedTags.${user.uid}`]: values.sharedTagId
            });

            await batch.commit();
            
            toast({
                title: 'Successfully Joined!',
                description: `You are now a member of "${ledger.name}".`,
            });
            setOpen(false);
            form.reset();

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to Join', description: 'An unexpected error occurred. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Join a Shared Ledger</DialogTitle>
                    <DialogDescription>
                        Enter the 6-character invite code to join an existing ledger.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="joinId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Invite Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="ABCDEF" {...field} maxLength={6} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="sharedTagId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Link with your personal tag</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={tagsLoading}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={tagsLoading ? "Loading tags..." : "Select a tag..."} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {activeTags?.map(tag => (
                                                <SelectItem key={tag.id} value={tag.id}>
                                                     <div className="flex items-center gap-2">
                                                        {renderIcon(tag.icon)}
                                                        {tag.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    <p className="text-xs text-muted-foreground pt-1">
                                        When you use this tag in your personal expenses, they will be automatically added to this shared ledger.
                                    </p>
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Join Ledger
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
