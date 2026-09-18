'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle, KeyRound } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { SharedSpace, UserProfile } from '@/lib/types';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { CreateSharedSpaceDialog } from '@/components/shared/CreateSharedSpaceDialog';
import { JoinSharedSpaceDialog } from '@/components/shared/JoinSharedSpaceDialog';
import { SharedSpacesList } from '@/components/shared/SharedSpacesList';

export default function SharedSpacesPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const [spaces, setSpaces] = useState<(SharedSpace & { id: string })[]>([]);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);

  // Stable string key so this effect only re-runs when the actual set of space
  // ids changes, not on every profile snapshot (unrelated profile fields change often).
  const idsKey = (userProfile?.sharedSpaceIds || []).join(',');

  useEffect(() => {
    if (!firestore || !user) return;
    const ids = idsKey ? idsKey.split(',') : [];

    if (ids.length === 0) {
      setSpaces([]);
      setIsLoadingSpaces(false);
      return;
    }

    let cancelled = false;
    setIsLoadingSpaces(true);

    (async () => {
      const results = await Promise.all(
        ids.map(async (id) => {
          const snap = await getDoc(doc(firestore, 'sharedSpaces', id));
          if (!snap.exists()) {
            // Stale reference (e.g. the space was deleted by its owner) — self-clean.
            updateDoc(doc(firestore, 'users', user.uid), { sharedSpaceIds: arrayRemove(id) }).catch(() => {});
            return null;
          }
          return { ...(snap.data() as SharedSpace), id: snap.id };
        })
      );
      if (!cancelled) {
        setSpaces(results.filter((s): s is SharedSpace & { id: string } => s !== null));
        setIsLoadingSpaces(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [firestore, user, idsKey]);

  return (
    <div className="w-full space-y-6 pb-32">
      <PageHeader description="Track expenses you split with someone else, separate from your personal expenses.">
        <JoinSharedSpaceDialog>
          <Button variant="outline" className="h-10 px-4 rounded-xl gap-2">
            <KeyRound className="h-4 w-4" />
            <span>Join</span>
          </Button>
        </JoinSharedSpaceDialog>
        <CreateSharedSpaceDialog>
          <Button className="h-10 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>Create</span>
          </Button>
        </CreateSharedSpaceDialog>
      </PageHeader>

      <SharedSpacesList spaces={spaces} currentUid={user?.uid} isLoading={isProfileLoading || isLoadingSpaces} />
    </div>
  );
}
