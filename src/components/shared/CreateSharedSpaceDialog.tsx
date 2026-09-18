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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { createSharedSpace } from '@/lib/shared-space';

export function CreateSharedSpaceDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const handleCreate = async () => {
    if (!user || !firestore || !name.trim()) return;
    setIsSaving(true);
    try {
      const code = await createSharedSpace(firestore, user.uid, user.displayName, user.photoURL, name.trim());
      toast({ title: 'Shared space created', description: `Join code: ${code}` });
      setOpen(false);
      setName('');
      router.push(`/shared/${code}`);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could Not Create Space', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a Shared Space</DialogTitle>
          <DialogDescription>
            You'll get a join code to share with the other person. Anything added here is visible to everyone in the space — your personal expenses stay private.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="space-name">Space Name</Label>
          <Input
            id="space-name"
            placeholder="e.g. Household, Trip to Goa"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isSaving || !name.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
