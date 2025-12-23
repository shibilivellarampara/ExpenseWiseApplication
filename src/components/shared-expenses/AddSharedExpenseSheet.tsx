
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
import { useState, useMemo } from 'react';
import { useFirestore, useUser, addDocumentNonBlocking, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { SharedExpense, Tag } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { renderIcon } from '@/lib/render-icon.tsx';

const addSharedExpenseSchema = z.object({
  name: z.string().min(3, 'Ledger name must be at least 3 characters long.'),
  sharedTagId: z.string().min(1, 'Please select a tag to link your personal expenses.'),
});

type AddSharedExpenseFormData = z.infer<typeof addSharedExpenseSchema>;

interface AddSharedExpenseSheetProps {
  children: React.ReactNode;
}

// Generate a random 6-character alphanumeric string
const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export function AddSharedExpenseSheet({ children }: AddSharedExpenseSheetProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();

  const tagsQuery = useMemo(() => user ? collection(firestore, `users/${user.uid}/tags`) : null, [user, firestore]);
  const { data: tags, isLoading: tagsLoading } = useCollection<Tag>(tagsQuery);
  const activeTags = useMemo(() => tags?.filter(t => t.status !== 'inactive'), [tags]);


  const form = useForm<AddSharedExpenseFormData>({
    resolver: zodResolver(addSharedExpenseSchema),
    defaultValues: {
      name: '',
      sharedTagId: '',
    },
  });

  async function onSubmit(values: AddSharedExpenseFormData) {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    setIsLoading(true);
    
    try {
        const newLedgerRef = doc(collection(firestore, 'shared_expenses'));
        const inviteCode = generateInviteCode();

        const newLedgerData: SharedExpense = {
            id: newLedgerRef.id,
            name: values.name,
            ownerId: user.uid,
            memberIds: [user.uid],
            inviteCode: inviteCode,
            balance: 0,
            memberSharedTags: {
                [user.uid]: values.sharedTagId
            }
        };

        await setDoc(newLedgerRef, newLedgerData);

        toast({
            title: 'Ledger Created!',
            description: `"${values.name}" has been created. Invite others with code: ${inviteCode}`,
        });
        setOpen(false);
        form.reset();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Could Not Create Ledger', description: "There was an unexpected error. Please try again." });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="font-headline">Create New Shared Ledger</SheetTitle>
          <SheetDescription>
            Start a new ledger to track expenses with a group.
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
                    <Input placeholder="e.g., Goa Trip, Home Expenses" {...field} />
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Ledger"}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
