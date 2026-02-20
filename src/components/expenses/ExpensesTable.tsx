'use client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EnrichedExpense, UserProfile } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2, X, Loader2, Check } from "lucide-react";
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { getCurrencySymbol } from "@/lib/currencies";
import { useMemo, useRef, useState, useEffect } from "react";
import { cn, formatAmount, generateColorStyle } from "@/lib/utils";
import { AddExpenseDialog } from "./AddExpenseDialog";
import { Button } from "@/components/ui/button";
import { useVirtualizer } from '@tanstack/react-virtual';
import { renderIcon } from '@/lib/render-icon';
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ExpensesTableProps {
  expenses: EnrichedExpense[];
  isLoading?: boolean;
  onDataChange: () => void;
  error?: string | null;
  onBadgeClick?: (type: 'category' | 'tag' | 'account', id: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isDeleting: boolean;
  onDeleteSelected: () => void;
}

type VirtualRow = { type: 'header'; date: string; balance?: number } | { type: 'expense'; expense: EnrichedExpense };

function GroupedExpenseList({ expenses, currencySymbol, onDataChange, viewMode, onBadgeClick, selectedIds, onSelectionChange, onDeleteSelected, isDeleting }: { expenses: EnrichedExpense[], currencySymbol: string, onDataChange: () => void; viewMode: 'normal' | 'compact', onBadgeClick?: (type: 'category' | 'tag' | 'account', id: string) => void; selectedIds: string[]; onSelectionChange: (ids: string[]) => void; isDeleting: boolean; onDeleteSelected: () => void; }) {
    
    const [selectionMode, setSelectionMode] = useState(false);
    const parentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSelectionMode(selectedIds.length > 0);
    }, [selectedIds]);

    const handleSelection = (id: string) => {
        const newSelectedIds = selectedIds.includes(id)
            ? selectedIds.filter(i => i !== id)
            : [...selectedIds, id];
        onSelectionChange(newSelectedIds);
    };

    const handleIconClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!selectionMode) {
            setSelectionMode(true);
            onSelectionChange([id]);
        } else {
            handleSelection(id);
        }
    };

    const allRows = useMemo(() => {
        const rows: VirtualRow[] = [];
        const groupedExpenses = expenses.reduce((acc, expense) => {
            const date = expense.date.toISOString().split('T')[0];
            if (!acc[date]) acc[date] = { items: [], balance: 0 };
            acc[date].items.push(expense);
            acc[date].balance += expense.type === 'income' ? expense.amount : -expense.amount;
            return acc;
        }, {} as { [key: string]: { items: EnrichedExpense[], balance: number } });

        Object.keys(groupedExpenses).sort((a,b) => b.localeCompare(a)).forEach(date => {
            rows.push({ type: 'header', date, balance: groupedExpenses[date].balance });
            groupedExpenses[date].items.forEach(expense => {
                rows.push({ type: 'expense', expense });
            });
        });
        return rows;
    }, [expenses]);

    const rowVirtualizer = useVirtualizer({
        count: allRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => {
             const row = allRows[index];
             if (row.type === 'header') return 48;
             return viewMode === 'compact' ? 64 : 84;
        },
        overscan: 5,
    });
    
    return (
        <div className="relative">
            {selectionMode && (
                <div className="sticky top-0 z-30 bg-primary/95 backdrop-blur-md p-3 rounded-2xl border-none shadow-xl flex justify-between items-center mb-4 transition-all animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-3 pl-2">
                        <div className="h-5 w-5 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                        <span className="font-bold text-sm text-primary-foreground uppercase tracking-widest">{selectedIds.length} Selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border-none" disabled={selectedIds.length === 0 || isDeleting}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[24px]">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete {selectedIds.length} transaction(s).</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={onDeleteSelected} className="bg-destructive hover:bg-destructive/90">
                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Confirm Delete"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                         </AlertDialog>
                        <Button variant="ghost" size="sm" className="h-9 px-4 text-white/80 hover:text-white" onClick={() => { setSelectionMode(false); onSelectionChange([]); }}>Cancel</Button>
                    </div>
                </div>
            )}
             <div ref={parentRef} style={{ height: `calc(100dvh - 140px)`, overflow: 'auto' }} className="no-scrollbar pr-1">
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
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${virtualItem.start}px)`,
                                }}
                            >
                                {isExpenseRow ? (
                                    <div 
                                        onClick={() => selectionMode && handleSelection(row.expense.id)}
                                        className={cn(
                                            "flex items-center gap-4 transition-all duration-200 mb-2 p-4 rounded-[18px] bg-card border border-border/40 group",
                                            selectionMode ? 'cursor-pointer' : '',
                                            selectedIds.includes(row.expense.id) ? "bg-primary/5 ring-1 ring-primary/30" : "shadow-sm hover:shadow-md"
                                        )}
                                    >
                                        <button
                                            onClick={(e) => handleIconClick(e, row.expense.id)}
                                            className={cn(
                                                "flex-shrink-0 rounded-full flex items-center justify-center transition-all",
                                                viewMode === 'compact' ? 'w-10 h-10' : 'w-12 h-12',
                                                row.expense.type === 'income' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                                                selectedIds.includes(row.expense.id) ? 'bg-primary text-primary-foreground' : ''
                                            )}
                                        >
                                            {selectedIds.includes(row.expense.id) ? (
                                                <Check className="h-5 w-5" />
                                            ) : (
                                                renderIcon(row.expense.category?.icon, viewMode === 'compact' ? 'h-5 w-5' : 'h-6 w-6')
                                            )}
                                        </button>

                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-sm truncate tracking-tight text-foreground/90">
                                                        {row.expense.description || (row.expense.type === 'income' ? 'Income' : row.expense.category?.name || 'Transaction')}
                                                    </h4>
                                                    <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                                                        <span>{row.expense.account?.name}</span>
                                                        <span className="opacity-30">•</span>
                                                        <span>{row.expense.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </p>
                                                </div>
                                                <div className="text-right flex flex-col items-end">
                                                    <p className={cn(
                                                        'font-bold text-base leading-none',
                                                        row.expense.type === 'income' ? 'text-primary' : 'text-destructive'
                                                    )}>
                                                        {row.expense.type === 'income' ? '+' : '-'}{currencySymbol}{formatAmount(row.expense.amount)}
                                                    </p>
                                                    {typeof row.expense.runningBalance === 'number' && (
                                                        <p className="text-[10px] font-bold text-muted-foreground/40 mt-1 uppercase tracking-tighter">
                                                            Bal: {currencySymbol}{formatAmount(row.expense.runningBalance)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {!selectionMode && (
                                                <div className="flex flex-wrap items-center gap-1.5 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <AddExpenseDialog expenseToEdit={row.expense} onSaveSuccess={onDataChange}>
                                                        <button className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                                                            <Edit className="h-3 w-3" /> Edit
                                                        </button>
                                                    </AddExpenseDialog>
                                                    {row.expense.tags?.slice(0, 2).map(tag => (
                                                        <Badge key={tag.id} variant="outline" style={generateColorStyle(tag.name)} className="badge-colorful text-[9px] px-1.5 h-4 font-bold uppercase">
                                                            {tag.name}
                                                        </Badge>
                                                    ))}
                                                    {(row.expense.tags?.length || 0) > 2 && (
                                                        <span className="text-[9px] font-bold text-muted-foreground">+{row.expense.tags!.length - 2}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 pt-6 pb-3 sticky top-0 bg-background/95 backdrop-blur-sm z-10 px-1">
                                        <div className="h-px flex-1 bg-border/50" />
                                        <div className="flex items-center gap-3">
                                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/80">
                                                {new Date(row.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </span>
                                            {typeof row.balance === 'number' && (
                                                <span className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                                    row.balance >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                                                )}>
                                                    {row.balance >= 0 ? '+' : '-'}{currencySymbol}{formatAmount(Math.abs(row.balance))}
                                                </span>
                                            )}
                                        </div>
                                        <div className="h-px flex-1 bg-border/50" />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}

export function ExpensesTable({ expenses, isLoading, onDataChange, error, onBadgeClick, selectedIds, onSelectionChange, isDeleting, onDeleteSelected }: ExpensesTableProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);
  const viewMode = userProfile?.dashboardSettings?.transactionViewMode || 'normal';
  
  if (isLoading) {
    return (
        <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-[18px]" />
            ))}
        </div>
    )
  }

  if (error) {
    return (
        <Card className="rounded-[20px] border-none shadow-sm bg-card">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-destructive">
               <LucideIcons.AlertCircle className="h-12 w-12 mb-4 opacity-50" />
               <h3 className="font-bold">Connection Lost</h3>
               <p className="text-sm text-muted-foreground mt-1">We couldn't load your transactions. Please check your network.</p>
            </CardContent>
        </Card>
    );
  }

  if (expenses.length === 0) {
    return (
       <div className="flex flex-col items-center justify-center text-center p-16 border-2 border-dashed rounded-[24px] bg-card/50">
          <LucideIcons.Inbox className="h-12 w-12 mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-bold text-foreground/80">Clear Skies</h3>
          <p className="text-sm text-muted-foreground mt-1">No transactions found for the selected filters.</p>
       </div>
    );
  }

  return <GroupedExpenseList expenses={expenses} currencySymbol={currencySymbol} onDataChange={onDataChange} viewMode={viewMode} onBadgeClick={onBadgeClick} selectedIds={selectedIds} onSelectionChange={onSelectionChange} isDeleting={isDeleting} onDeleteSelected={onDeleteSelected} />;
}