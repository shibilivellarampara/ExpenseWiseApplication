
'use client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EnrichedExpense, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { Pilcrow, TrendingUp, Edit } from "lucide-react";
import * as LucideIcons from 'lucide-react';
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { getCurrencySymbol } from "@/lib/currencies";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { AddExpenseDialog } from "./AddExpenseDialog";
import { Button } from "../ui/button";

interface ExpensesTableProps {
  expenses: EnrichedExpense[];
  isLoading?: boolean;
}

const renderIcon = (iconName: string | undefined, className?: string) => {
  if (!iconName) return <Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent ? <IconComponent className={cn("h-4 w-4 text-muted-foreground", className)} /> : <Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
};

// Function to generate a color from a string
const generateColorFromString = (str: string): { backgroundColor: string, textColor: string } => {
    if (!str) {
        // Return a default color for undefined/null/empty strings
        const defaultHue = 0;
        return {
            backgroundColor: `hsl(${defaultHue}, 70%, 90%)`,
            textColor: `hsl(${defaultHue}, 70%, 25%)`
        };
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    const backgroundColor = `hsl(${hue}, 70%, 90%)`; // Lighter background
    const textColor = `hsl(${hue}, 70%, 25%)`; // Darker text
    return { backgroundColor, textColor };
};


function GroupedExpenseList({ expenses, currencySymbol }: { expenses: EnrichedExpense[], currencySymbol: string }) {
    const [editingExpense, setEditingExpense] = useState<EnrichedExpense | undefined>(undefined);

    const groupedExpenses = useMemo(() => {
        return expenses.reduce((acc, expense) => {
            const date = expense.date.toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(expense);
            return acc;
        }, {} as Record<string, EnrichedExpense[]>);
    }, [expenses]);

    const sortedDates = useMemo(() => Object.keys(groupedExpenses).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()), [groupedExpenses]);

    return (
        <div className="space-y-6">
            {sortedDates.map(date => (
                <div key={date}>
                    <h3 className="text-sm font-semibold text-muted-foreground px-4 pb-2 border-b">
                        {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                    <div className="divide-y">
                        {groupedExpenses[date].map(expense => {
                            const categoryColor = expense.category ? generateColorFromString(expense.category.name) : null;
                            const tagColor = expense.tag ? generateColorFromString(expense.tag.name) : null;
                            return (
                            <div key={expense.id} className="p-4 flex items-start gap-4 group">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center mt-1">
                                    {expense.type === 'income' ?
                                        <TrendingUp className="h-5 w-5 text-green-500" /> :
                                        renderIcon(expense.category?.icon)
                                    }
                                </div>
                                <div className="flex-grow grid grid-cols-2 gap-x-4 gap-y-1">
                                    <div className="font-semibold truncate">{expense.description || (expense.type === 'income' ? 'Income' : expense.category?.name || 'Transaction')}</div>
                                    <div className={`font-bold text-lg text-right ${expense.type === 'income' ? 'text-green-600' : ''}`}>
                                        {expense.type === 'income' ? '+' : '-'}{currencySymbol}{expense.amount.toFixed(2)}
                                    </div>

                                    {/* Middle section for details */}
                                    <div className="col-span-2 text-xs text-muted-foreground flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                            {renderIcon(expense.account?.icon, "h-3 w-3")}
                                            <span>{expense.account?.name}</span>
                                        </div>
                                        <div>
                                            {expense.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    
                                     <div className="col-span-2 flex items-center gap-2 mt-1">
                                        {expense.category && categoryColor && (
                                            <Badge 
                                                style={{ backgroundColor: categoryColor.backgroundColor, color: categoryColor.textColor }}
                                                className="flex items-center gap-1 border-transparent"
                                            >
                                                {renderIcon(expense.category.icon, "h-3 w-3")}
                                                {expense.category.name}
                                            </Badge>
                                        )}
                                        {expense.tag && tagColor && (
                                            <Badge 
                                                style={{ backgroundColor: tagColor.backgroundColor, color: tagColor.textColor }}
                                                className="flex items-center gap-1 border-transparent"
                                            >
                                                {renderIcon(expense.tag.icon, "h-3 w-3")}
                                                {expense.tag.name}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0 w-32 flex flex-col justify-between items-end h-full">
                                    <AddExpenseDialog expenseToEdit={expense}>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </AddExpenseDialog>
                                    <p className="text-xs text-muted-foreground mt-auto">
                                        Balance: {currencySymbol}{expense.balanceAfterTransaction?.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        )})}
                    </div>
                </div>
            ))}
        </div>
    )
}

export function ExpensesTable({ expenses, isLoading }: ExpensesTableProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
             <div key={i} className="space-y-4">
                <Skeleton className="h-5 w-1/3" />
                <div className="space-y-2">
                    {Array.from({length: 2}).map((_, j) => (
                         <div key={j} className="p-4 flex items-center gap-4">
                             <Skeleton className="w-10 h-10 rounded-full" />
                            <div className="flex-grow grid grid-cols-2 gap-2">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-5 w-1/2 ml-auto" />
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-4 w-1/3 ml-auto" />
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (expenses.length === 0) {
    return (
       <Card>
          <CardContent className="pt-6">
              <div className="h-48 flex flex-col items-center justify-center text-center">
                 <h3 className="text-lg font-semibold">No transactions found.</h3>
                 <p className="text-muted-foreground">Click "Add Transaction" to get started!</p>
              </div>
          </CardContent>
       </Card>
    );
  }

  return (
    <Card>
        <CardContent className="p-0">
            <GroupedExpenseList expenses={expenses} currencySymbol={currencySymbol} />
        </CardContent>
    </Card>
  )
}
