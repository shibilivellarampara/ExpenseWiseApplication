'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { DateTimePicker } from '@/components/DateTimePicker';
import { SharedSpaceMember } from '@/lib/types';

const sharedExpenseSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than zero.'),
  description: z.string().optional(),
  date: z.date(),
  paidByUid: z.string().min(1, 'Select who paid.'),
});

type SharedExpenseFormData = z.infer<typeof sharedExpenseSchema>;

export function AddSharedExpenseDialog({ spaceId, members, children }: { spaceId: string; members: SharedSpaceMember[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<SharedExpenseFormData>({
    resolver: zodResolver(sharedExpenseSchema),
    defaultValues: {
      amount: '' as any,
      description: '',
      date: new Date(),
      paidByUid: user?.uid || '',
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      form.reset({ amount: '' as any, description: '', date: new Date(), paidByUid: user?.uid || '' });
    }
  };

  const onSubmit = async (values: SharedExpenseFormData) => {
    if (!user || !firestore) return;
    setIsSaving(true);
    try {
      const expenseRef = doc(collection(firestore, `sharedSpaces/${spaceId}/expenses`));
      await setDocumentNonBlocking(expenseRef, {
        id: expenseRef.id,
        spaceId,
        createdByUid: user.uid,
        paidByUid: values.paidByUid,
        amount: values.amount,
        description: values.description || '',
        date: values.date,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Shared Expense Added' });
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error Saving', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Shared Expense</DialogTitle>
          <DialogDescription>Visible to everyone in this space.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Groceries" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <DateTimePicker field={field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paidByUid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid By *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select who paid" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.uid} value={member.uid}>
                          {member.uid === user?.uid ? 'You' : member.displayName || 'Member'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Add Expense'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
