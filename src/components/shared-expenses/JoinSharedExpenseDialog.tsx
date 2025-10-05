
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, arrayUnion } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { SharedExpense } from '@/lib/types';

const joinSchema = z.object({
    joinId: z.string().length(6, 'The join code must be 6 characters long.'),
});

interface JoinSharedExpenseDialogProps {
    children: React.ReactNode;
}

export function JoinSharedExpenseDialog({ children }: JoinSharedExpenseDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();

    const form = useForm<z.infer<typeof joinSchema>>({
        resolver: zodResolver(joinSchema),
        defaultValues: { joinId: '' },
    });

    const onSubmit = async (values: z.infer<typeof joinSchema>) => {
        setIsLoading(true);
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to join a space.' });
            setIsLoading(false);
            return;
        }

        try {
            // Find the shared expense with the given joinId
            const spacesRef = collection(firestore, 'shared_expenses');
            const q = query(spacesRef, where('joinId', '==', values.joinId.toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error('No shared space found with this Join ID. Please check the code and try again.');
            }

            const spaceDoc = querySnapshot.docs[0];
            const spaceData = spaceDoc.data() as SharedExpense;

            if (spaceData.memberIds.includes(user.uid)) {
                toast({ title: "Already a member", description: `You are already a member of "${spaceData.name}".` });
                setOpen(false);
                form.reset();
                return;
            }

            // Add the current user's ID to the memberIds array
            const batch = writeBatch(firestore);
            batch.update(spaceDoc.ref, {
                memberIds: arrayUnion(user.uid),
            });
            await batch.commit();

            toast({ title: 'Successfully Joined!', description: `You are now a member of "${spaceData.name}".` });
            setOpen(false);
            form.reset();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to Join', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Join a Shared Space</DialogTitle>
                    <DialogDescription>
                        Enter the 6-character join code you received from the space owner.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="joinId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Join Code</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="ABC123" 
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Join Space
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
