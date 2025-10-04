
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
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, query, where, getDocs, writeBatch, serverTimestamp, doc } from 'firebase/firestore';
import { Loader2, X } from 'lucide-react';
import { Badge } from '../ui/badge';

const sharedExpenseSchema = z.object({
    name: z.string().min(1, 'Space name is required.'),
    memberEmails: z.array(z.string().email()).min(1, 'At least one member is required.'),
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
    const [emailInput, setEmailInput] = useState('');

    const form = useForm<z.infer<typeof sharedExpenseSchema>>({
        resolver: zodResolver(sharedExpenseSchema),
        defaultValues: {
            name: '',
            memberEmails: user?.email ? [user.email] : [],
        },
    });
    
    // Reset form when sheet opens/closes and user is available
    useEffect(() => {
        if (user?.email) {
            form.reset({
                name: '',
                memberEmails: [user.email],
            });
        }
    }, [open, user, form]);

    const handleAddEmail = () => {
        if (emailInput && z.string().email().safeParse(emailInput).success) {
            const currentEmails = form.getValues('memberEmails');
            if (!currentEmails.includes(emailInput)) {
                form.setValue('memberEmails', [...currentEmails, emailInput]);
                setEmailInput('');
            }
        }
    };

    const handleRemoveEmail = (emailToRemove: string) => {
        const currentEmails = form.getValues('memberEmails');
        form.setValue('memberEmails', currentEmails.filter(email => email !== emailToRemove));
    };


    async function onSubmit(values: z.infer<typeof sharedExpenseSchema>) {
        setIsLoading(true);
        if (!firestore || !user) {
             toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
             setIsLoading(false);
             return;
        }

        try {
            const batch = writeBatch(firestore);
            
            // 1. Find user profiles for all member emails
            const usersRef = collection(firestore, 'users');
            const memberIds: string[] = [];
            const userDocsToUpdate: {ref: any, id: string}[] = [];

            for (const email of values.memberEmails) {
                const q = query(usersRef, where('email', '==', email));
                const querySnapshot = await getDocs(q);
                if (querySnapshot.empty) {
                    throw new Error(`User with email ${email} not found.`);
                }
                const userDoc = querySnapshot.docs[0];
                memberIds.push(userDoc.id);
                userDocsToUpdate.push({ref: userDoc.ref, id: userDoc.id});
            }

            // 2. Create the new shared_expense document in the root collection
            const sharedExpensesCol = collection(firestore, `shared_expenses`);
            const newSharedExpenseRef = doc(sharedExpensesCol);
            
            batch.set(newSharedExpenseRef, {
                id: newSharedExpenseRef.id,
                name: values.name,
                ownerId: user.uid,
                memberIds,
                joinId: generateJoinId(),
                createdAt: serverTimestamp(),
            });
            
            await batch.commit();
            
            toast({
                title: 'Shared Space Created!',
                description: `${values.name} has been created.`,
            });
            setOpen(false);

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }
    
    const memberEmails = form.watch('memberEmails');

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{children}</SheetTrigger>
            <SheetContent className="overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="font-headline">Create New Shared Space</SheetTitle>
                    <SheetDescription>
                        Invite members by email to share expenses. A unique join code will be generated.
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
                        
                        <FormItem>
                            <FormLabel>Invite Members</FormLabel>
                             <div className="flex gap-2">
                                <Input 
                                    placeholder="friend@example.com" 
                                    value={emailInput}
                                    onChange={e => setEmailInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddEmail(); }}}
                                />
                                <Button type="button" onClick={handleAddEmail}>Add</Button>
                            </div>
                        </FormItem>

                        <FormField
                            control={form.control}
                            name="memberEmails"
                            render={() => (
                                <FormItem>
                                    <div className="space-y-2">
                                        <FormLabel>Members</FormLabel>
                                        <div className="flex flex-wrap gap-2">
                                            {memberEmails.map(email => (
                                                <Badge key={email} variant="secondary">
                                                    {email}
                                                     {email !== user?.email && (
                                                        <button type="button" onClick={() => handleRemoveEmail(email)} className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                        </button>
                                                    )}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
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
