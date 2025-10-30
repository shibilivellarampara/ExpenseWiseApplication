
'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EnrichedExpense, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { Pilcrow, TrendingUp, Edit, User as UserIcon, Wallet } from "lucide-react";
import * as LucideIcons from 'lucide-react';
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { getCurrencySymbol } from "@/lib/currencies";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { AddExpenseDialog } from "./AddExpenseDialog";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "../ui/tooltip";

interface ExpensesTableProps {
  expenses: EnrichedExpense[];
  isLoading?: boolean;
  isShared?: boolean;
  onDataChange: () => void;
}

const renderIcon = (iconName: string | undefined, className?: string) => {
  if (!iconName) return <Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent ? <IconComponent className={cn("h-4 w-4 text-muted-foreground", className)} /> : <Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
};

const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

// Function to generate a color from a string
const generateColorFromString = (str: string): { backgroundColor: string, textColor: string } => {
    if (!str) {
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

const formatAmount = (amount: number) => {
    if (amount % 1 === 0) {
        return amount.toString();
    }
    return amount.toFixed(2);
};


function GroupedExpenseList({ expenses, isShared, currencySymbol, onDataChange }: { expenses: EnrichedExpense[], isShared?: boolean, currencySymbol: string, onDataChange: () => void; }) {

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
        <div className="space-y-4">
            {sortedDates.map(date => (
                <Card key={date}>
                    <CardHeader className="py-3 px-4 border-b">
                        <CardTitle className="text-base">
                             {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {groupedExpenses[date].map(expense => {
                                const categoryColor = expense.category ? generateColorFromString(expense.category.name) : null;
                                return (
                                <div key={expense.id} className="p-4 flex items-start gap-4 group">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center mt-1">
                                        {expense.type === 'income' ?
                                            <Wallet className="h-5 w-5 text-green-500" /> :
                                            renderIcon(expense.category?.icon, 'h-5 w-5 text-gray-700')
                                        }
                                    </div>
                                    <div className="flex-grow space-y-1 w-full min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div className="font-semibold truncate flex-1 pr-4">{expense.description || (expense.type === 'income' ? 'Income' : expense.category?.name || 'Transaction')}</div>
                                            <div className="text-right flex-shrink-0 w-auto flex flex-col items-end">
                                                <div className="flex items-center">
                                                    <AddExpenseDialog expenseToEdit={expense} sharedExpenseId={expense.sharedExpenseId} onSaveSuccess={onDataChange}>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </AddExpenseDialog>
                                                    <div className={cn(
                                                        'font-bold text-lg',
                                                        expense.type === 'income' ? 'text-green-600' : 'text-red-500'
                                                    )}>
                                                        {formatAmount(expense.amount)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-xs text-muted-foreground flex items-center gap-4">
                                            <div className="flex items-center gap-1">
                                                {isShared && expense.user ? (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger className="flex items-center gap-1">
                                                                <Avatar className="h-4 w-4">
                                                                    <AvatarImage src={expense.user.photoURL || ''} alt={expense.user.name || 'user'}/>
                                                                    <AvatarFallback>{getInitials(expense.user.name)}</AvatarFallback>
                                                                </Avatar>
                                                                <span>{expense.user.name}</span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Transaction added by {expense.user.name}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                ) : (
                                                    <>
                                                        {renderIcon(expense.account?.icon, "h-3 w-3")}
                                                        <span>{expense.account?.name}</span>
                                                    </>
                                                )}
                                            </div>
                                            <div>
                                                {expense.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-2 pt-1 w-full">
                                            {expense.category && categoryColor && (
                                                <Badge 
                                                    style={{ backgroundColor: categoryColor.backgroundColor, color: categoryColor.textColor }}
                                                    className="flex items-center gap-1 border-transparent"
                                                >
                                                    {renderIcon(expense.category.icon, "h-3 w-3")}
                                                    {expense.category.name}
                                                </Badge>
                                            )}
                                            {expense.tags?.map(tag => {
                                                const tagColor = generateColorFromString(tag.name);
                                                return (
                                                <Badge 
                                                    key={tag.id}
                                                    style={{ backgroundColor: tagColor.backgroundColor, color: tagColor.textColor }}
                                                    className="flex items-center gap-1 border-transparent"
                                                >
                                                    {renderIcon(tag.icon, "h-3 w-3")}
                                                    {tag.name}
                                                </Badge>
                                            )})}
                                        </div>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

export function ExpensesTable({ expenses, isLoading, isShared, onDataChange }: ExpensesTableProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
                <CardHeader>
                    <Skeleton className="h-5 w-1/3" />
                </CardHeader>
                <CardContent className="space-y-2">
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
                </CardContent>
            </Card>
        ))}
      </div>
    )
  }

  if (expenses.length === 0) {
    return (
       <Card>
          <CardContent className="pt-6">
              <div className="h-48 flex flex-col items-center justify-center text-center">
                 <h3 className="text-lg font-semibold">No transactions found.</h3>
                 <p className="text-muted-foreground">Try adjusting your filters or add a new transaction.</p>
              </div>
          </CardContent>
       </Card>
    );
  }

  return <GroupedExpenseList expenses={expenses} isShared={isShared} currencySymbol={currencySymbol} onDataChange={onDataChange} />;
}
