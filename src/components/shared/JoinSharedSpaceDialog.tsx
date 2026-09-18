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
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser, commitBatchNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { JOIN_CODE_LENGTH } from '@/lib/shared-space';

export function JoinSharedSpaceDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const handleJoin = async () => {
    if (!user || !firestore || code.length !== JOIN_CODE_LENGTH) return;
    setIsJoining(true);
    try {
      // A single get()-by-ID, never a where()+list query — that circularity is
      // exactly what killed the last two attempts at this feature.
      const spaceRef = doc(firestore, 'sharedSpaces', code);
      const spaceSnap = await getDoc(spaceRef);
      if (!spaceSnap.exists()) {
        toast({ variant: 'destructive', title: 'Space Not Found', description: 'No shared space matches that code. Double-check it and try again.' });
        return;
      }

      const memberRef = doc(firestore, `sharedSpaces/${code}/members`, user.uid);
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) {
        setOpen(false);
        router.push(`/shared/${code}`);
        return;
      }

      const batch = writeBatch(firestore);
      batch.set(memberRef, {
        uid: user.uid,
        spaceId: code,
        spaceName: spaceSnap.data()?.name ?? '',
        displayName: user.displayName,
        photoURL: user.photoURL,
        isOwner: false,
        joinedAt: serverTimestamp(),
      });
      batch.update(spaceRef, { memberCount: increment(1) });
      await commitBatchNonBlocking(batch, `sharedSpaces/${code}`);

      toast({ title: 'Joined Shared Space' });
      setOpen(false);
      setCode('');
      router.push(`/shared/${code}`);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could Not Join Space', description: error.message });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a Shared Space</DialogTitle>
          <DialogDescription>Enter the {JOIN_CODE_LENGTH}-digit code the other person shared with you.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <InputOTP maxLength={JOIN_CODE_LENGTH} value={code} onChange={setCode} pattern={REGEXP_ONLY_DIGITS}>
            <InputOTPGroup>
              {Array.from({ length: JOIN_CODE_LENGTH }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleJoin} disabled={isJoining || code.length !== JOIN_CODE_LENGTH}>
            {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Join'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
