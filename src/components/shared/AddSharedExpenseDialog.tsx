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
import { SharedSpaceMember, SharedCategory, SharedTag } from '@/lib/types';
import { cn } from '@/lib/utils';

const sharedExpenseSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than zero.'),
  description: z.string().optional(),
  date: z.date(),
  paidByUid: z.string().min(1, 'Select who paid.'),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

type SharedExpenseFormData = z.infer<typeof sharedExpenseSchema>;

interface AddSharedExpenseDialogProps {
  spaceId: string;
  members: SharedSpaceMember[];
  categories: SharedCategory[];
  tags: SharedTag[];
  children: React.ReactNode;
}

export function AddSharedExpenseDialog({ spaceId, members, categories, tags, children }: AddSharedExpenseDialogProps) {
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
      categoryId: '',
      tagIds: [],
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      form.reset({ amount: '' as any, description: '', date: new Date(), paidByUid: user?.uid || '', categoryId: '', tagIds: [] });
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
        ...(values.categoryId ? { categoryId: values.categoryId } : {}),
        ...(values.tagIds && values.tagIds.length > 0 ? { tagIds: values.tagIds } : {}),
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
            {categories.length > 0 && (
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {tags.length > 0 && (
              <FormField
                control={form.control}
                name="tagIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const selected = (field.value || []).includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => field.onChange(selected ? (field.value || []).filter((id) => id !== tag.id) : [...(field.value || []), tag.id])}
                            className={cn(
                              'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                              selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent border-input hover:bg-muted'
                            )}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
