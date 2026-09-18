'use client';

import {
  Firestore,
  Timestamp,
  WriteBatch,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
  arrayUnion,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Tag } from '@/lib/types';

export const JOIN_CODE_LENGTH = 7;

export function generateJoinCode(): string {
  const max = 10 ** JOIN_CODE_LENGTH;
  return String(Math.floor(Math.random() * max)).padStart(JOIN_CODE_LENGTH, '0');
}

export async function createSharedSpace(
  firestore: Firestore,
  uid: string,
  displayName: string | null,
  photoURL: string | null,
  name: string
): Promise<string> {
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateJoinCode();
    const spaceRef = doc(firestore, 'sharedSpaces', code);
    const memberRef = doc(firestore, `sharedSpaces/${code}/members`, uid);
    const userRef = doc(firestore, 'users', uid);
    try {
      await runTransaction(firestore, async (tx) => {
        const snap = await tx.get(spaceRef);
        if (snap.exists()) throw new Error('COLLISION');
        tx.set(spaceRef, {
          name,
          ownerId: uid,
          createdAt: serverTimestamp(),
        });
        tx.set(memberRef, {
          uid,
          spaceId: code,
          spaceName: name,
          displayName,
          photoURL,
          isOwner: true,
          joinedAt: serverTimestamp(),
        });
        tx.set(userRef, { sharedSpaceIds: arrayUnion(code) }, { merge: true });
      });
      return code;
    } catch (e) {
      if ((e as Error).message === 'COLLISION') continue;
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({ path: spaceRef.path, operation: 'create' })
      );
      throw e;
    }
  }
  throw new Error('Could not generate a unique join code. Please try again.');
}

/** Distinct shared-space ids linked to any of the given tag ids. */
export function getLinkedSpaceIds(tagIds: string[] | undefined, tags: Tag[]): string[] {
  if (!tagIds || tagIds.length === 0) return [];
  const linkedTagMap = new Map(tags.map((t) => [t.id, t.linkedSharedSpaceId]));
  const spaceIds = new Set<string>();
  for (const tagId of tagIds) {
    const spaceId = linkedTagMap.get(tagId);
    if (spaceId) spaceIds.add(spaceId);
  }
  return Array.from(spaceIds);
}

type MirrorablePersonalExpense = {
  id: string;
  userId: string;
  amount: number;
  description?: string;
  date: Timestamp | Date;
};

/**
 * Queues a mirror of a personal expense into a shared space's ledger onto an
 * existing batch. Uses the personal expense's own id as the mirrored doc's id,
 * so re-running this (e.g. re-linking a tag) overwrites the same doc instead
 * of creating a duplicate.
 */
export function addExpenseMirrorToBatch(
  batch: WriteBatch,
  firestore: Firestore,
  spaceId: string,
  expense: MirrorablePersonalExpense,
  extra: { categoryId?: string; tagIds?: string[] } = {}
) {
  const ref = doc(firestore, `sharedSpaces/${spaceId}/expenses`, expense.id);
  batch.set(
    ref,
    {
      id: expense.id,
      spaceId,
      paidByUid: expense.userId,
      createdByUid: expense.userId,
      amount: expense.amount,
      description: expense.description || '',
      date: expense.date,
      createdAt: serverTimestamp(),
      mirroredFromPersonal: true,
      ...(extra.categoryId ? { categoryId: extra.categoryId } : {}),
      ...(extra.tagIds && extra.tagIds.length > 0 ? { tagIds: extra.tagIds } : {}),
    },
    { merge: true }
  );
}

/** Mirrors every personal expense already carrying `tagId` into `spaceId`. */
export async function backfillTagExpensesToSpace(
  firestore: Firestore,
  uid: string,
  tagId: string,
  spaceId: string
) {
  const q = query(collection(firestore, `users/${uid}/expenses`), where('tagIds', 'array-contains', tagId));
  const snapshot = await getDocs(q);
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(firestore);
    docs.slice(i, i + 450).forEach((docSnap) => {
      const data = docSnap.data() as Omit<MirrorablePersonalExpense, 'id' | 'userId'>;
      addExpenseMirrorToBatch(batch, firestore, spaceId, { ...data, id: docSnap.id, userId: uid });
    });
    await batch.commit();
  }
}
