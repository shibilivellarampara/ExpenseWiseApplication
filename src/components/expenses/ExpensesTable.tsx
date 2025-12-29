
'use client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EnrichedExpense, UserProfile } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Pilcrow, Edit, User as UserIcon, Wallet, AlertTriangle } from "lucide-react";
import * as LucideIcons from 'lucide-react';
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { getCurrencySymbol } from "@/lib/currencies";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AddExpenseDialog } from "./AddExpenseDialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useVirtualizer } from '@tanstack/react-virtual';
import { generateColorStyle } from "@/lib/utils";
import { renderIcon } from '@/lib/render-icon';

interface ExpensesTableProps {
  expenses: EnrichedExpense[];
  isLoading?: boolean;
  onDataChange: () => void;
  error?: string | null;
  onBadgeClick?: (type: 'category' | 'tag' | 'account', id: string) => void;
}

const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const formatAmount = (amount: number) => {
    if (amount % 1 === 0) {
        return amount.toString();
    }
    return amount.toFixed(2);
};

type VirtualRow = { type: 'header'; date: string } | { type: 'expense'; expense: EnrichedExpense };

function GroupedExpenseList({ expenses, currencySymbol, onDataChange, viewMode, onBadgeClick }: { expenses: EnrichedExpense[], currencySymbol: string, onDataChange: () => void; viewMode: 'normal' | 'compact', onBadgeClick?: (type: 'category' | 'tag' | 'account', id: string) => void; }) {
    
    const [openEditDialog, setOpenEditDialog] = useState<string | null>(null);
    const [expandedTags, setExpandedTags] = useState<Record<string, boolean>>({});

    const allRows = useMemo(() => {
        const rows: VirtualRow[] = [];
        const groupedExpenses = expenses.reduce((acc, expense) => {
            const date = expense.date.toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(expense);
            return acc;
        }, {} as { [key: string]: EnrichedExpense[] });

        Object.keys(groupedExpenses).forEach(date => {
            rows.push({ type: 'header', date });
            groupedExpenses[date].forEach(expense => {
                rows.push({ type: 'expense', expense });
            });
        });
        return rows;
    }, [expenses]);


    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: allRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => {
             const row = allRows[index];
             if (row.type === 'header') return viewMode === 'compact' ? 30 : 38;
             if (viewMode === 'compact') return 48; // Compact view row height
             // Estimate normal view height
             let height = 60;
             if (row.expense.tags && row.expense.tags.length > 0) height += 20;
             if (row.expense.category) height += 20;
             return height;
        },
        overscan: 5,
        measureElement: typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
            ? (element) => element.getBoundingClientRect().height
            : undefined,
    });

    return (
        <div ref={parentRef} className="h-[80vh] overflow-y-auto bg-card rounded-lg border">
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {rowVirtualizer.getVirtualItems().map(virtualItem => {
                    const row = allRows[virtualItem.index];
                    const isExpenseRow = row.type === 'expense';
                    
                    return (
                        <div
                            key={virtualItem.key}
                            data-index={virtualItem.index}
                            ref={rowVirtualizer.measureElement}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                        >
                            {isExpenseRow ? (
                                <>
                                    <div className={cn(
                                        "flex items-center gap-3 group border-b w-full bg-card",
                                        viewMode === 'compact' ? 'p-2' : 'p-3'
                                    )}>
                                        <div className={cn(
                                            "flex-shrink-0 rounded-full bg-muted flex items-center justify-center",
                                            viewMode === 'compact' ? 'w-7 h-7' : 'w-8 h-8'
                                        )}>
                                            {renderIcon(row.expense.category?.icon, cn(row.expense.type === 'income' ? 'text-green-500' : 'text-gray-700', viewMode === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'))}
                                        </div>
                                        <div className="flex-grow space-y-0.5 w-full min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 pr-4">
                                                    <div className="font-medium text-sm break-words">{row.expense.description || (row.expense.type === 'income' ? 'Income' : row.expense.category?.name || 'Transaction')}</div>
                                                </div>
                                                <div className="text-right flex-shrink-0 w-auto flex flex-col items-end">
                                                    <div className="flex items-center">
                                                        <AddExpenseDialog
                                                            expenseToEdit={row.expense}
                                                            onSaveSuccess={onDataChange}
                                                        >
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Edit className="h-4 w-4 text-muted-foreground" />
                                                            </Button>
                                                        </AddExpenseDialog>
                                                        <div className={cn(
                                                            'font-bold',
                                                            viewMode === 'compact' ? 'text-sm' : 'text-base',
                                                            row.expense.type === 'income' ? 'text-green-600' : 'text-red-500'
                                                        )}>
                                                            {row.expense.type === 'income' ? '+' : '-'}{currencySymbol}{formatAmount(row.expense.amount)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-xs text-muted-foreground flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        className="flex items-center gap-1 rounded-md px-1 -mx-1 transition-colors hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring"
                                                        onClick={(e) => { e.stopPropagation(); onBadgeClick?.('account', row.expense.account!.id)}}
                                                        disabled={!row.expense.account}
                                                    >
                                                        {renderIcon(row.expense.account?.icon, "h-3 w-3 mr-0")}
                                                        <span>{row.expense.account?.name}</span>
                                                    </button>
                                                    <span className="text-muted-foreground/50">&bull;</span>
                                                    <span>{row.expense.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                {typeof row.expense.runningBalance === 'number' && (
                                                    <div className="text-muted-foreground">
                                                        Bal: {currencySymbol}{formatAmount(row.expense.runningBalance)}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {viewMode === 'normal' && (
                                                <div className="flex flex-wrap items-center gap-1 pt-1 w-full">
                                                    {row.expense.category && (
                                                        <Badge
                                                            style={generateColorStyle(row.expense.category.name)}
                                                            className="badge-colorful text-xs px-1.5 py-0 cursor-pointer"
                                                            onClick={(e) => { e.stopPropagation(); onBadgeClick?.('category', row.expense.category!.id)}}
                                                        >
                                                            {renderIcon(row.expense.category.icon, "h-3 w-3 mr-1")}
                                                            {row.expense.category.name}
                                                        </Badge>
                                                    )}
                                                    
                                                     {(expandedTags[row.expense.id] ? row.expense.tags : (row.expense.tags || []).slice(0, 3)).map(tag => (
                                                        <Badge
                                                            key={tag.id}
                                                            style={generateColorStyle(tag.name)}
                                                            className="badge-colorful text-xs px-1.5 py-0 cursor-pointer"
                                                            onClick={(e) => { e.stopPropagation(); onBadgeClick?.('tag', tag.id)}}
                                                        >
                                                            {renderIcon(tag.icon, "h-3 w-3 mr-1")}
                                                            {tag.name}
                                                        </Badge>
                                                    ))}
                                                    {(row.expense.tags?.length || 0) > 3 && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-xs px-1.5 py-0 cursor-pointer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedTags(prev => ({...prev, [row.expense.id]: !prev[row.expense.id]}));
                                                            }}
                                                        >
                                                            {expandedTags[row.expense.id] ? 'Less' : `+${(row.expense.tags?.length || 0) - 3} more`}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className={cn(
                                    "px-3 sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b",
                                    viewMode === 'compact' ? 'py-1' : 'py-2'
                                )}>
                                    <h3 className="text-sm font-semibold">
                                        {new Date(row.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </h3>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
}

export function ExpensesTable({ expenses, isLoading, onDataChange, error, onBadgeClick }: ExpensesTableProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);
  const viewMode = userProfile?.dashboardSettings?.transactionViewMode || 'normal';
  
  if (isLoading) {
    return (
        <div className="bg-card rounded-lg border">
            <div className="space-y-2 p-4">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="p-2 flex items-center gap-4">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-grow grid grid-cols-2 gap-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-5 w-1/2 ml-auto" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
  }

  if (error) {
    return (
        <div className="bg-card rounded-lg border">
            <div className="h-48 flex flex-col items-center justify-center text-center text-destructive p-4">
               <AlertTriangle className="h-10 w-10 mb-4" />
               <h3 className="text-lg font-semibold">Could not load transactions</h3>
               <p className="text-sm">{error}</p>
            </div>
        </div>
    );
  }

  if (expenses.length === 0) {
    return (
       <div className="bg-card rounded-lg border">
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
             <h3 className="text-lg font-semibold">No transactions found.</h3>
             <p className="text-muted-foreground">Try adjusting your filters or add a new transaction.</p>
          </div>
       </div>
    );
  }

  return <GroupedExpenseList expenses={expenses} currencySymbol={currencySymbol} onDataChange={onDataChange} viewMode={viewMode} onBadgeClick={onBadgeClick}/>;
}
