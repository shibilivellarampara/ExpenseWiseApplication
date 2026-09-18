'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, arrayRemove, Firestore } from 'firebase/firestore';
import { useDoc, useMemoFirebase } from '@/firebase';
import { SharedSpace, UserProfile } from '@/lib/types';

/**
 * Resolves the current user's UserProfile.sharedSpaceIds into the actual
 * SharedSpace docs. Self-heals stale ids (e.g. a space deleted by its owner)
 * by removing any id whose getDoc comes back not-found.
 */
export function useMySharedSpaces(firestore: Firestore | null | undefined, uid: string | null | undefined) {
  const userProfileRef = useMemoFirebase(() => (uid ? doc(firestore!, 'users', uid) : null), [firestore, uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const [spaces, setSpaces] = useState<(SharedSpace & { id: string })[]>([]);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);

  // Stable string key so this effect only re-runs when the actual set of space
  // ids changes, not on every profile snapshot (unrelated profile fields change often).
  const idsKey = (userProfile?.sharedSpaceIds || []).join(',');

  useEffect(() => {
    if (!firestore || !uid) return;
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
            updateDoc(doc(firestore, 'users', uid), { sharedSpaceIds: arrayRemove(id) }).catch(() => {});
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
  }, [firestore, uid, idsKey]);

  return { spaces, isLoading: isProfileLoading || isLoadingSpaces };
}
