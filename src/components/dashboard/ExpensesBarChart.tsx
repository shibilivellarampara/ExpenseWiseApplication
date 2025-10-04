
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';
import { EnrichedExpense } from '@/lib/types';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, getDay, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';
import { BarChart as BarChartIcon } from 'lucide-react';

interface ExpensesBarChartProps {
  expenses: EnrichedExpense[];
  timeRange: 'week' | 'month' | 'year';
  currencySymbol: string;
}

export function ExpensesBarChart({ expenses, timeRange, currencySymbol }: ExpensesBarChartProps) {
  const chartData = useMemo(() => {
    if (!expenses.length) {
      return [];
    }
    const now = new Date();

    if (timeRange === 'week') {
        const start = startOfWeek(now);
        const end = endOfWeek(now);
        const intervalDays = eachDayOfInterval({ start, end });

        const dailyExpenses = new Map<string, number>();
        intervalDays.forEach(day => {
            dailyExpenses.set(format(day, 'yyyy-MM-dd'), 0);
        });

        expenses.forEach(expense => {
            const dayKey = format(expense.date, 'yyyy-MM-dd');
            if (dailyExpenses.has(dayKey)) {
                dailyExpenses.set(dayKey, dailyExpenses.get(dayKey)! + expense.amount);
            }
        });
        
        return Array.from(dailyExpenses.entries()).map(([date, amount]) => ({
            name: format(new Date(date), 'EEE'),
            amount,
        }));

    } else if (timeRange === 'month') { 
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        const weeks = eachWeekOfInterval({ start, end });

        const weeklyExpenses = new Map<string, number>();
        weeks.forEach(weekStart => {
            weeklyExpenses.set(format(weekStart, 'yyyy-MM-dd'), 0);
        });

        expenses.forEach(expense => {
            const weekStart = startOfWeek(expense.date);
            const weekKey = format(weekStart, 'yyyy-MM-dd');
            if (weeklyExpenses.has(weekKey)) {
                weeklyExpenses.set(weekKey, weeklyExpenses.get(weekKey)! + expense.amount);
            }
        });

        return Array.from(weeklyExpenses.entries()).map(([date, amount]) => ({
            name: `Week of ${format(new Date(date), 'MMM d')}`,
            amount,
        }));
    } else { // timeRange === 'year'
        const start = startOfYear(now);
        const end = endOfYear(now);
        const intervalMonths = eachMonthOfInterval({ start, end });
        
        const monthlyExpenses = new Map<string, number>();
        intervalMonths.forEach(month => {
            monthlyExpenses.set(format(month, 'yyyy-MM'), 0);
        });

        expenses.forEach(expense => {
            const monthKey = format(expense.date, 'yyyy-MM');
            if (monthlyExpenses.has(monthKey)) {
                monthlyExpenses.set(monthKey, monthlyExpenses.get(monthKey)! + expense.amount);
            }
        });

        return Array.from(monthlyExpenses.entries()).map(([date, amount]) => ({
            name: format(new Date(date), 'MMM'),
            amount,
        }));
    }
  }, [expenses, timeRange]);

  if (!expenses.length) {
    return (
        <div className="flex h-[350px] w-full items-center justify-center rounded-lg border-2 border-dashed">
            <div className="flex flex-col items-center text-center text-muted-foreground">
                <BarChartIcon className="h-12 w-12" />
                <p className="mt-4">No expense data for this period.</p>
                <p className="text-sm">Your spending chart will appear here.</p>
            </div>
        </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData}>
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${currencySymbol}${value}`}
        />
        <Tooltip
            contentStyle={{ 
                background: "hsl(var(--background))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)"
            }}
            cursor={{ fill: 'hsl(var(--muted))' }}
            labelFormatter={(label) => label}
            formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, "Expense"]}
        />
        <Legend wrapperStyle={{fontSize: "14px"}}/>
        <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Expense" />
      </BarChart>
    </ResponsiveContainer>
  );
}
