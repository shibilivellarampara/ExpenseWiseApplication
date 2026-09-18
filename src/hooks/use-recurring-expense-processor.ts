'use client';

import { useEffect, useRef } from 'react';
import {
  collection,
  doc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  where,
  writeBatch,
  Firestore,
  Timestamp,
} from 'firebase/firestore';
import { RecurringExpense } from '@/lib/types';

function getNextOccurrence(date: Date, frequency: RecurringExpense['frequency']): Date {
  const next = new Date(date);
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

// Caps how many missed occurrences get backfilled in a single pass, so a long-dormant
// daily/weekly item can't generate an unbounded number of expenses in one run — it will
// simply keep catching up on subsequent app loads.
const MAX_CATCHUP_OCCURRENCES = 60;

async function processRecurringItem(
  firestore: Firestore,
  uid: string,
  item: RecurringExpense & { id: string }
) {
  if (!item.accountId) return; // No account to post the generated expense against.

  const now = new Date();
  let nextDue = item.nextDueDate.toDate();
  if (nextDue > now) return;

  const batch = writeBatch(firestore);
  let lastCreated = nextDue;
  let occurrences = 0;

  while (nextDue <= now && occurrences < MAX_CATCHUP_OCCURRENCES) {
    const expenseRef = doc(collection(firestore, `users/${uid}/expenses`));
    batch.set(expenseRef, {
      id: expenseRef.id,
      userId: uid,
      type: item.type,
      amount: item.amount,
      description: item.description || item.name,
      date: Timestamp.fromDate(nextDue),
      createdAt: serverTimestamp(),
      accountId: item.accountId,
      ...(item.categoryId ? { categoryId: item.categoryId } : {}),
    });

    const accountRef = doc(firestore, `users/${uid}/accounts`, item.accountId);
    batch.update(accountRef, {
      balance: increment(item.type === 'income' ? item.amount : -item.amount),
    });

    lastCreated = nextDue;
    occurrences++;
    nextDue = getNextOccurrence(nextDue, item.frequency);
  }

  const recurringRef = doc(firestore, `users/${uid}/recurringExpenses`, item.id);
  batch.update(recurringRef, {
    nextDueDate: Timestamp.fromDate(nextDue),
    lastCreatedDate: Timestamp.fromDate(lastCreated),
  });

  await batch.commit();
}

/**
 * Backfills expense/income documents for any active recurring item whose nextDueDate
 * has passed. Runs once per authenticated session on app load (client-only reconciliation
 * — there's no scheduled server-side job for this yet).
 */
export function useRecurringExpenseProcessor(
  firestore: Firestore | null | undefined,
  uid: string | null | undefined
) {
  const processedForUid = useRef<string | null>(null);

  useEffect(() => {
    if (!firestore || !uid || processedForUid.current === uid) return;
    processedForUid.current = uid;

    (async () => {
      try {
        const dueQuery = query(
          collection(firestore, `users/${uid}/recurringExpenses`),
          where('status', '==', 'active')
        );
        const snapshot = await getDocs(dueQuery);
        for (const docSnap of snapshot.docs) {
          const item = { ...(docSnap.data() as RecurringExpense), id: docSnap.id };
          await processRecurringItem(firestore, uid, item);
        }
      } catch (e) {
        console.error('Failed to process recurring expenses', e);
      }
    })();
  }, [firestore, uid]);
}
