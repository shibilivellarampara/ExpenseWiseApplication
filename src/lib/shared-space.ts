'use client';

import {
  Firestore,
  doc,
  runTransaction,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
          memberCount: 1,
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
