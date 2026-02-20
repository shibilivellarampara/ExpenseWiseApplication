'use client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EnrichedExpense, UserProfile } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2, X, Loader2, Check, AlertCircle, Inbox, Clock, ListChecks } from "lucide-react";
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { getCurrencySymbol } from "@/lib/currencies";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { cn, formatAmount, generateColorStyle } from "@/lib/utils";
import { AddExpenseDialog } from "./AddExpenseDialog";
import { Button } from "@/components/ui/button";
import { useVirtualizer } from '@tanstack/react-virtual';
import { renderIcon } from '@/lib/render-icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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

type VirtualRow = { type: 'expense'; expense: EnrichedExpense };

function GroupedExpenseList({ expenses, currencySymbol, onDataChange, viewMode, onBadgeClick, selectedIds, onSelectionChange, onDeleteSelected, isDeleting }: { expenses: EnrichedExpense[], currencySymbol: string, onDataChange: () => void; viewMode: 'normal' | 'compact', onBadgeClick?: (type: 'category' | 'tag' | 'account', id: string) => void; selectedIds: string[]; onSelectionChange: (ids: string[]) => void; isDeleting: boolean; onDeleteSelected: () => void; }) {
    
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [expandedTagRows, setExpandedTagRows] = useState<Set<string>>(new Set());
    const parentRef = useRef<HTMLDivElement>(null);

    const handleSelection = (id: string) => {
        const newSelectedIds = selectedIds.includes(id)
            ? selectedIds.filter(i => i !== id)
            : [...selectedIds, id];
        onSelectionChange(newSelectedIds);
    };

    const handleIconClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        setFocusedId(prev => prev === id ? null : id);
    };

    const handleRowClick = (e: React.MouseEvent, expense: EnrichedExpense) => {
        if (selectedIds.length > 0) {
            e.stopPropagation();
            e.preventDefault();
            handleSelection(expense.id);
            return;
        }
        if (focusedId) {
            setFocusedId(null);
        }
    };

    const handleBadgeClickInternal = (e: React.MouseEvent, type: 'category' | 'tag' | 'account', id: string) => {
        e.stopPropagation();
        e.preventDefault();
        onBadgeClick?.(type, id);
    };

    const toggleTagsExpand = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        setExpandedTagRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const allRows = useMemo((): VirtualRow[] => {
        return expenses.map(expense => ({ type: 'expense', expense }));
    }, [expenses]);

    const rowVirtualizer = useVirtualizer({
        count: allRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => viewMode === 'compact' ? 85 : 115,
        overscan: 5,
    });
    
    return (
        <div className="relative">
            {selectedIds.length > 0 && (
                <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md p-3 rounded-2xl border border-border shadow-xl flex justify-between items-center mb-4 transition-all animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-3 pl-2 text-foreground">
                        <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <Check className="h-3 w-3" />
                        </div>
                        <span className="font-bold text-sm uppercase tracking-widest">{selectedIds.length} Selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="h-9 px-4 rounded-xl" disabled={selectedIds.length === 0 || isDeleting}>
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
                        <Button variant="ghost" size="sm" className="h-9 px-4 text-muted-foreground hover:text-foreground" onClick={() => { onSelectionChange([]); }}>Cancel</Button>
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
                        const isFocused = focusedId === row.expense.id;
                        const isSelected = selectedIds.includes(row.expense.id);
                        const isTagsExpanded = expandedTagRows.has(row.expense.id);

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
                                <div 
                                    onClick={(e) => handleRowClick(e, row.expense)}
                                    className={cn(
                                        "flex items-center gap-4 transition-all duration-200 mb-2 p-4 rounded-[18px] bg-card border border-border/40 group relative cursor-pointer",
                                        isSelected ? "bg-primary/5 ring-1 ring-primary/30" : "shadow-sm hover:shadow-md",
                                        isFocused && "ring-1 ring-primary/20 bg-primary/[0.02]"
                                    )}
                                >
                                    <button
                                        onClick={(e) => handleIconClick(e, row.expense.id)}
                                        className={cn(
                                            "flex-shrink-0 rounded-full flex items-center justify-center transition-all",
                                            viewMode === 'compact' ? 'w-10 h-10' : 'w-12 h-12',
                                            row.expense.type === 'income' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                                            isSelected ? 'bg-primary text-primary-foreground' : 'hover:scale-110 active:scale-95'
                                        )}
                                    >
                                        {isSelected ? (
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
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <button 
                                                        onClick={(e) => row.expense.account && handleBadgeClickInternal(e, 'account', row.expense.account.id)}
                                                        className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest hover:text-primary transition-colors"
                                                    >
                                                        {row.expense.account?.name}
                                                    </button>
                                                    <span className="opacity-30 text-[11px] font-bold text-muted-foreground/60">•</span>
                                                    <span className="text-[11px] font-bold text-muted-foreground/60 flex items-center gap-1">
                                                        <Clock className="h-2.5 w-2.5" />
                                                        {row.expense.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end min-w-[100px] justify-center h-full">
                                                {isFocused ? (
                                                    <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                                                        <Button 
                                                            variant="outline" 
                                                            size="icon" 
                                                            className={cn(
                                                                "h-8 w-8 rounded-full border-primary/20 text-primary hover:bg-primary/5 shadow-none",
                                                                isSelected && "bg-primary text-primary-foreground border-none"
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                handleSelection(row.expense.id);
                                                            }}
                                                        >
                                                            <ListChecks className="h-3.5 w-3.5" />
                                                        </Button>
                                                        {selectedIds.length < 2 && (
                                                            <AddExpenseDialog expenseToEdit={row.expense} onSaveSuccess={onDataChange}>
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="icon" 
                                                                    className="h-8 w-8 rounded-full border-primary/20 text-primary hover:bg-primary/5 shadow-none"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Edit className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </AddExpenseDialog>
                                                        )}
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="icon" 
                                                                    className="h-8 w-8 rounded-full border-destructive/20 text-destructive hover:bg-destructive/5 shadow-none"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="rounded-[24px]">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
                                                                    <AlertDialogDescription>This will remove the record and update your account balance. This action cannot be undone.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onSelectionChange([row.expense.id]);
                                                                            setTimeout(() => onDeleteSelected(), 50);
                                                                        }} 
                                                                        className="bg-destructive hover:bg-destructive/90"
                                                                    >
                                                                        Delete
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialog>
                                                        </AlertDialog>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p className={cn('font-bold text-[15px] leading-none', row.expense.type === 'income' ? 'text-primary' : 'text-destructive')}>
                                                            {row.expense.type === 'income' ? '+' : '-'}{currencySymbol}{formatAmount(row.expense.amount)}
                                                        </p>
                                                        {typeof row.expense.runningBalance === 'number' && (
                                                            <p className="text-[10px] font-bold text-muted-foreground/40 mt-1.5 uppercase tracking-tighter">
                                                                {currencySymbol}{formatAmount(row.expense.runningBalance)}
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-1.5 pt-2">
                                            {row.expense.category && (
                                                <Badge 
                                                    variant="secondary" 
                                                    onClick={(e) => handleBadgeClickInternal(e, 'category', row.expense.category!.id)}
                                                    className="h-5 px-2 bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer text-[9px] font-bold uppercase tracking-widest border-none"
                                                >
                                                    {row.expense.category.name}
                                                </Badge>
                                            )}

                                            {(() => {
                                                const tags = row.expense.tags || [];
                                                const tagsToShow = isTagsExpanded ? tags : tags.slice(0, 2);
                                                const hasMore = !isTagsExpanded && tags.length > 2;

                                                return (
                                                    <>
                                                        {tagsToShow.map(tag => (
                                                            <Badge 
                                                                key={tag.id} 
                                                                variant="outline" 
                                                                onClick={(e) => handleBadgeClickInternal(e, 'tag', tag.id)}
                                                                style={generateColorStyle(tag.name)} 
                                                                className="badge-colorful text-[9px] px-2 h-5 font-bold uppercase cursor-pointer hover:opacity-80 transition-opacity border-none"
                                                            >
                                                                {tag.name}
                                                            </Badge>
                                                        ))}
                                                        {hasMore && (
                                                            <Badge 
                                                                variant="outline" 
                                                                className="h-5 px-1.5 text-[9px] font-bold text-muted-foreground border-none bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                                                                onClick={(e) => toggleTagsExpand(e, row.expense.id)}
                                                            >
                                                                +{tags.length - 2}
                                                            </Badge>
                                                        )}
                                                        {isTagsExpanded && tags.length > 2 && (
                                                            <Badge 
                                                                variant="outline"
                                                                className="h-5 px-1.5 text-[9px] font-bold text-muted-foreground border-none bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                                                                onClick={(e) => toggleTagsExpand(e, row.expense.id)}
                                                            >
                                                                <X className="h-2 w-2" />
                                                            </Badge>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
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
               <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
               <h3 className="font-bold">Connection Lost</h3>
               <p className="text-sm text-muted-foreground mt-1">We couldn't load your transactions. Please check your network.</p>
            </CardContent>
        </Card>
    );
  }

  if (expenses.length === 0) {
    return (
       <div className="flex flex-col items-center justify-center text-center p-16 border-2 border-dashed rounded-[24px] bg-card/50">
          <Inbox className="h-12 w-12 mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-bold text-foreground/80">Clear Skies</h3>
          <p className="text-sm text-muted-foreground mt-1">No transactions found for the selected filters.</p>
       </div>
    );
  }

  return <GroupedExpenseList expenses={expenses} currencySymbol={currencySymbol} onDataChange={onDataChange} viewMode={viewMode} onBadgeClick={onBadgeClick} selectedIds={selectedIds} onSelectionChange={selectedIds => onSelectionChange(selectedIds)} isDeleting={isDeleting} onDeleteSelected={onDeleteSelected} />;
}
