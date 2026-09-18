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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { doc, deleteField } from 'firebase/firestore';
import { useMySharedSpaces } from '@/hooks/use-my-shared-spaces';
import { backfillTagExpensesToSpace } from '@/lib/shared-space';
import { Tag } from '@/lib/types';

const NONE_VALUE = '__none__';

export function LinkTagToSharedSpaceDialog({ tag, children }: { tag: Tag; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState(tag.linkedSharedSpaceId || NONE_VALUE);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { spaces, isLoading } = useMySharedSpaces(firestore, user?.uid);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setSelectedSpaceId(tag.linkedSharedSpaceId || NONE_VALUE);
  };

  const handleSave = async () => {
    if (!user || !firestore) return;
    setIsSaving(true);
    try {
      const tagRef = doc(firestore, `users/${user.uid}/tags`, tag.id);
      if (selectedSpaceId === NONE_VALUE) {
        await setDocumentNonBlocking(tagRef, { linkedSharedSpaceId: deleteField() }, { merge: true });
        toast({ title: 'Tag Unlinked' });
      } else {
        await setDocumentNonBlocking(tagRef, { linkedSharedSpaceId: selectedSpaceId }, { merge: true });
        await backfillTagExpensesToSpace(firestore, user.uid, tag.id, selectedSpaceId);
        toast({ title: 'Tag Linked', description: `Expenses tagged "${tag.name}" will now also be added to that shared space.` });
      }
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link "{tag.name}" to a Shared Space</DialogTitle>
          <DialogDescription>
            Personal expenses tagged "{tag.name}" will automatically be copied into the linked shared space going forward, and any expenses that already have this tag will be copied in right away too. Unlinking only stops future copies — it won't remove ones already copied.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
          ) : spaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">You're not part of any shared spaces yet. Create or join one first.</p>
          ) : (
            <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>No link</SelectItem>
                {spaces.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || (spaces.length === 0 && selectedSpaceId === NONE_VALUE)}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
