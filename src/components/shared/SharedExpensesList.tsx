'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt } from 'lucide-react';
import { SharedExpense, SharedSpaceMember } from '@/lib/types';
import { formatAmount } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
import { format } from 'date-fns';

interface SharedExpensesListProps {
  expenses: (SharedExpense & { id: string })[];
  members: SharedSpaceMember[];
  currentUid?: string;
  currency?: string;
  isLoading?: boolean;
}

export function SharedExpensesList({ expenses, members, currentUid, currency, isLoading }: SharedExpensesListProps) {
  const currencySymbol = getCurrencySymbol(currency);
  const memberMap = new Map(members.map((m) => [m.uid, m]));

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-2xl bg-card/50">
        <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold">No Shared Expenses Yet</h3>
        <p className="text-muted-foreground mt-1">Add the first expense to start the shared ledger.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => {
        const payer = memberMap.get(expense.paidByUid);
        const payerLabel = expense.paidByUid === currentUid ? 'You' : payer?.displayName || 'Member';
        return (
          <Card key={expense.id} className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={payer?.photoURL || undefined} />
                <AvatarFallback>{payerLabel.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-grow min-w-0">
                <p className="font-semibold truncate">{expense.description || 'Shared expense'}</p>
                <p className="text-xs text-muted-foreground">
                  Paid by {payerLabel} &middot; {format(expense.date instanceof Date ? expense.date : (expense.date as any).toDate(), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="font-bold shrink-0">{currencySymbol}{formatAmount(expense.amount)}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
