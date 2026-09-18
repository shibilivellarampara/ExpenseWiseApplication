'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatAmount } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
import { SharedExpense, SharedSpaceMember } from '@/lib/types';

interface SharedExpensesSummaryProps {
  expenses: (SharedExpense & { id: string })[];
  members: SharedSpaceMember[];
  currentUid?: string;
  currency?: string;
  isLoading?: boolean;
}

export function SharedExpensesSummary({ expenses, members, currentUid, currency, isLoading }: SharedExpensesSummaryProps) {
  const currencySymbol = getCurrencySymbol(currency);

  const { total, byMember } = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const byMember = new Map<string, number>();
    expenses.forEach((e) => {
      byMember.set(e.paidByUid, (byMember.get(e.paidByUid) || 0) + e.amount);
    });
    return { total, byMember };
  }, [expenses]);

  if (isLoading) {
    return <Skeleton className="h-28 w-full rounded-[20px]" />;
  }

  return (
    <Card className="rounded-[20px] border-none shadow-sm">
      <CardContent className="p-6 flex items-center justify-between gap-6 flex-wrap">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Total Spent</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1">{currencySymbol}{formatAmount(total)}</p>
        </div>
        <div className="flex flex-wrap gap-4">
          {members.map((m) => {
            const amount = byMember.get(m.uid) || 0;
            const label = m.uid === currentUid ? 'You' : m.displayName || 'Member';
            return (
              <div key={m.uid} className="flex items-center gap-2">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={m.photoURL || undefined} />
                  <AvatarFallback>{label.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">{label}</p>
                  <p className="text-sm font-bold">{currencySymbol}{formatAmount(amount)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
