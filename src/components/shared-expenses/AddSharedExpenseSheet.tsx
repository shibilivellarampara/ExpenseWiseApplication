
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
import { useState, useEffect } from 'react';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

const sharedExpenseSchema = z.object({
    name: z.string().min(1, 'Space name is required.'),
});

// Function to generate a random 6-character alphanumeric string
const generateJoinId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

interface AddSharedExpenseSheetProps {
    children: React.ReactNode;
}

export function AddSharedExpenseSheet({ children }: AddSharedExpenseSheetProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();

    const form = useForm<z.infer<typeof sharedExpenseSchema>>({
        resolver: zodResolver(sharedExpenseSchema),
        defaultValues: {
            name: '',
        },
    });
    
    useEffect(() => {
        if(open) {
            form.reset({ name: '' });
        }
    }, [open, form]);


    async function onSubmit(values: z.infer<typeof sharedExpenseSchema>) {
        setIsLoading(true);
        if (!firestore || !user) {
             toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
             setIsLoading(false);
             return;
        }

        try {
            const sharedExpensesCol = collection(firestore, `shared_expenses`);
            
            await addDocumentNonBlocking(sharedExpensesCol, {
                name: values.name,
                ownerId: user.uid,
                memberIds: [user.uid],
                joinId: generateJoinId(),
                createdAt: serverTimestamp(),
            });
            
            toast({
                title: 'Shared Space Created!',
                description: `${values.name} has been created. Share the join code with others.`,
            });
            setOpen(false);

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{children}</SheetTrigger>
            <SheetContent className="overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="font-headline">Create New Shared Space</SheetTitle>
                    <SheetDescription>
                        A unique 6-character join code will be generated for others to join.
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Space Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Goa Trip 2024" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Space"}
                        </Button>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}
