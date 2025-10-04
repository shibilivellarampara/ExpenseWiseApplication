'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';
import { EnrichedExpense } from '@/lib/types';
import { format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { BarChart as BarChartIcon } from 'lucide-react';

interface ExpensesBarChartProps {
  expenses: EnrichedExpense[];
}

export function ExpensesBarChart({ expenses }: ExpensesBarChartProps) {
  const chartData = useMemo(() => {
    if (!expenses.length) {
      return [];
    }

    const now = new Date();
    // Use the most recent expense date to determine the week, or default to today
    const latestDate = expenses.reduce((max, e) => e.date > max ? e.date : max, expenses[0].date);
    const start = startOfWeek(latestDate);
    const end = endOfWeek(latestDate);
    const weekDays = eachDayOfInterval({ start, end });

    // Initialize daily expenses map
    const dailyExpenses = new Map<string, number>();
    weekDays.forEach(day => {
      dailyExpenses.set(format(day, 'yyyy-MM-dd'), 0);
    });

    // Sum expenses for each day
    expenses.forEach(expense => {
      const dayKey = format(expense.date, 'yyyy-MM-dd');
      if (dailyExpenses.has(dayKey)) {
        dailyExpenses.set(dayKey, dailyExpenses.get(dayKey)! + expense.amount);
      }
    });

    // Format for chart
    return Array.from(dailyExpenses.entries()).map(([date, amount]) => ({
      date,
      amount,
    }));
  }, [expenses]);

  if (!expenses.length) {
    return (
        <div className="flex h-[350px] w-full items-center justify-center rounded-lg border-2 border-dashed">
            <div className="flex flex-col items-center text-center text-muted-foreground">
                <BarChartIcon className="h-12 w-12" />
                <p className="mt-4">No expense data for this month.</p>
                <p className="text-sm">Your weekly spending chart will appear here.</p>
            </div>
        </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData}>
        <XAxis
          dataKey="date"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => format(new Date(value), 'EEE')}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
            contentStyle={{ 
                background: "hsl(var(--background))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
            }}
            cursor={{ fill: 'hsl(var(--muted))' }}
            labelFormatter={(label) => format(new Date(label), 'PPP')}
        />
        <Legend wrapperStyle={{fontSize: "14px"}}/>
        <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Expense" />
      </BarChart>
    </ResponsiveContainer>
  );
}
