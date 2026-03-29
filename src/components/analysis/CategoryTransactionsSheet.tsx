
'use client';

import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription 
} from "@/components/ui/dialog";
import { EnrichedExpense, CategoryStat } from "@/lib/types";
import { getCurrencySymbol } from "@/lib/currencies";
import { cn, formatAmount, generateColorStyle } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { renderIcon } from "@/lib/render-icon";

interface CategoryTransactionsSheetProps {
    category: CategoryStat | null;
    expenses: EnrichedExpense[];
    currency?: string;
    view?: 'expense' | 'income' | 'net';
    onClose: () => void;
}

export function CategoryTransactionsSheet({ category, expenses, currency, view = 'expense', onClose }: CategoryTransactionsSheetProps) {
    const currencySymbol = getCurrencySymbol(currency);

    const categoryExpenses = expenses
        .filter(e => (e.category?.id || 'other') === category?.id)
        .filter(e => {
            if (view === 'net') return true;
            return e.type === view;
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime());

    const getAmountColor = () => {
        if (view === 'expense') return 'text-destructive';
        if (view === 'income') return 'text-primary';
        return (category?.amount || 0) >= 0 ? 'text-primary' : 'text-destructive';
    };

    return (
        <Dialog open={!!category} onOpenChange={(open) => !open && onClose()}>
            <DialogContent 
                className="sm:max-w-2xl w-[95vw] h-[80vh] flex flex-col p-0 gap-0 rounded-[24px] overflow-hidden border-none shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
            >
                <DialogHeader className="p-6 pb-4 border-b bg-card shrink-0">
                    <div className="flex justify-between items-center pr-10 gap-4">
                        <div className="min-w-0 flex flex-col gap-0.5">
                            <DialogTitle className="text-lg font-bold truncate">
                                {category?.name}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground font-normal">
                                {categoryExpenses.length} transactions
                            </DialogDescription>
                        </div>
                        <div className="text-right shrink-0">
                            <p className={cn(
                                "text-lg sm:text-xl font-black tracking-tight whitespace-nowrap",
                                getAmountColor()
                            )}>
                                {currencySymbol}{formatAmount(Math.abs(category?.amount || 0))}
                            </p>
                        </div>
                    </div>
                </DialogHeader>
                
                <ScrollArea className="flex-1 px-4 py-4 bg-background/50">
                    <div className="space-y-3 pb-12">
                        {categoryExpenses.map((expense) => (
                            <div key={expense.id} className="flex flex-col gap-2 p-4 rounded-2xl bg-card border border-border/40 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[14px] sm:text-[15px] font-bold truncate leading-tight text-foreground/90">
                                            {expense.description || category?.name}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            <span className="flex items-center gap-1">
                                                {renderIcon(expense.account?.icon, "h-2.5 w-2.5 opacity-70")}
                                                {expense.account?.name}
                                            </span>
                                            <span className="opacity-30">&bull;</span>
                                            <span>{format(expense.date, 'MMM d, yyyy')}</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right min-w-[110px] ml-2">
                                        <p className={cn(
                                            "text-[15px] font-black tabular-nums whitespace-nowrap",
                                            expense.type === 'income' ? "text-primary" : "text-destructive"
                                        )}>
                                            {expense.type === 'income' ? '+' : '-'}{currencySymbol}{formatAmount(expense.amount)}
                                        </p>
                                    </div>
                                </div>

                                {expense.tags && expense.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {expense.tags.map(tag => (
                                            <Badge 
                                                key={tag.id} 
                                                variant="outline"
                                                style={generateColorStyle(tag.name)}
                                                className="badge-colorful text-[9px] h-4.5 px-2 font-bold uppercase tracking-widest border-none"
                                            >
                                                {tag.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {categoryExpenses.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50">
                                {renderIcon("SearchX", "h-12 w-12 mb-2")}
                                <p className="text-sm font-medium">No transactions found.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
