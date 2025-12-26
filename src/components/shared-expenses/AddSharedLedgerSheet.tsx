
'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '../ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Loader2, PlusCircle } from 'lucide-react';

const ledgerSchema = z.object({
  name: z.string().min(3, 'Ledger name must be at least 3 characters long.'),
});

type LedgerFormData = z.infer<typeof ledgerSchema>;

// Helper to generate a random, human-readable code
const generateInviteCode = (length = 6) => {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};


export function AddSharedLedgerSheet() {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();

    const form = useForm<LedgerFormData>({
        resolver: zodResolver(ledgerSchema),
        defaultValues: {
            name: '',
        },
    });

    async function onSubmit(values: LedgerFormData) {
        setIsLoading(true);
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            setIsLoading(false);
            return;
        }

        try {
            const ledgerData = {
                name: values.name,
                ownerId: user.uid,
                memberIds: [user.uid],
                inviteCode: generateInviteCode(),
                memberSharedTags: {},
                createdAt: serverTimestamp(),
            };
            
            const ledgersCol = collection(firestore, `shared_ledgers`);
            await addDocumentNonBlocking(ledgersCol, ledgerData);
            
            toast({ title: 'Ledger Created!', description: `"${values.name}" has been created.` });
            setOpen(false);
            form.reset();

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Could Not Create Ledger', description: error.message || "An unexpected error occurred." });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Ledger
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle className="font-headline">Create a New Shared Ledger</SheetTitle>
                    <SheetDescription>
                        Start a new ledger to share expenses with friends or family.
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ledger Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Trip to Goa" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Ledger"}
                        </Button>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}
