'use client';

import { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, useMemoFirebase, commitBatchNonBlocking } from '@/firebase';
import { collection, query, orderBy, limit, writeBatch } from 'firebase/firestore';
import { Expense, SharedCategory, SharedTag } from '@/lib/types';
import { formatAmount } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { addExpenseMirrorToBatch } from '@/lib/shared-space';

interface CopyPersonalExpensesDialogProps {
  spaceId: string;
  categories: SharedCategory[];
  tags: SharedTag[];
  children: React.ReactNode;
}

export function CopyPersonalExpensesDialog({ spaceId, categories, tags, children }: CopyPersonalExpensesDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isCopying, setIsCopying] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const expensesQuery = useMemoFirebase(() =>
    user && open ? query(collection(firestore, `users/${user.uid}/expenses`), orderBy('date', 'desc'), limit(100)) : null
  , [firestore, user, open]);
  const { data: personalExpenses, isLoading } = useCollection<Expense>(expensesQuery);

  const filteredExpenses = useMemo(() => {
    if (!personalExpenses) return [];
    const q = searchQuery.toLowerCase();
    return q ? personalExpenses.filter((e) => e.description?.toLowerCase().includes(q)) : personalExpenses;
  }, [personalExpenses, searchQuery]);

  const handleSelectionChange = (id: string, checked: boolean | string) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
  };

  const handleSelectAll = () => {
    setSelectedIds(selectedIds.length === filteredExpenses.length ? [] : filteredExpenses.map((e) => e.id));
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]));
  };

  const resetAndClose = () => {
    setOpen(false);
    setSelectedIds([]);
    setSearchQuery('');
    setCategoryId('');
    setSelectedTagIds([]);
  };

  const handleCopy = async () => {
    if (!user || !firestore || selectedIds.length === 0) return;
    setIsCopying(true);
    try {
      const toCopy = (personalExpenses || []).filter((e) => selectedIds.includes(e.id));
      for (let i = 0; i < toCopy.length; i += 450) {
        const batch = writeBatch(firestore);
        toCopy.slice(i, i + 450).forEach((expense) => {
          addExpenseMirrorToBatch(batch, firestore, spaceId, { ...expense, userId: user.uid }, { categoryId, tagIds: selectedTagIds });
        });
        await commitBatchNonBlocking(batch, `sharedSpaces/${spaceId}/expenses`);
      }
      toast({ title: `${selectedIds.length} Expense(s) Copied`, description: 'Your personal expenses are unaffected.' });
      resetAndClose();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Copy Failed', description: error.message });
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Copy Personal Expenses</DialogTitle>
          <DialogDescription>
            Pick expenses from your own history to add to this shared space. Your personal expenses are untouched — this creates new entries here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search your expenses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" />
          </div>

          {(categories.length > 0 || tags.length > 0) && (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Applied to every expense you copy in this batch (optional):</p>
              {categories.length > 0 && (
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Assign a category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTag(t.id)}
                      className={cn(
                        'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                        selectedTagIds.includes(t.id) ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent border-input hover:bg-muted'
                      )}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
          ) : (
            <>
              {filteredExpenses.length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                  <Checkbox id="select-all-personal" checked={selectedIds.length === filteredExpenses.length} onCheckedChange={handleSelectAll} />
                  <Label htmlFor="select-all-personal" className="text-sm font-medium">{selectedIds.length} selected</Label>
                </div>
              )}
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {filteredExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer" onClick={() => handleSelectionChange(expense.id, !selectedIds.includes(expense.id))}>
                    <Checkbox checked={selectedIds.includes(expense.id)} onCheckedChange={(checked) => handleSelectionChange(expense.id, checked)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{expense.description || 'No description'}</p>
                    </div>
                    <p className="text-sm font-bold shrink-0">{formatAmount(expense.amount)}</p>
                  </div>
                ))}
                {filteredExpenses.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">No personal expenses found.</p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
          <Button onClick={handleCopy} disabled={isCopying || selectedIds.length === 0} className="gap-2">
            {isCopying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            Copy {selectedIds.length > 0 ? selectedIds.length : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
