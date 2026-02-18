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
        if (view === 'expense') return 'text-[#EB5757]';
        if (view === 'income') return 'text-[#27AE60]';
        return (category?.amount || 0) >= 0 ? 'text-[#27AE60]' : 'text-[#EB5757]';
    };

    return (
        <Dialog open={!!category} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md w-full sm:w-[95vw] h-[75vh] flex flex-col p-0 gap-0 rounded-t-[24px] sm:rounded-[24px] overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b bg-card shrink-0">
                    <div className="flex justify-between items-start pr-8 gap-4">
                        <div className="min-w-0">
                            <DialogTitle className="text-xl font-bold font-headline truncate">{category?.name}</DialogTitle>
                            <DialogDescription className="text-[13px] font-semibold text-muted-foreground/70 uppercase tracking-widest mt-1">
                                {categoryExpenses.length} Transactions
                            </DialogDescription>
                        </div>
                        <div className="text-right shrink-0">
                            <p className={cn(
                                "text-xl font-bold",
                                getAmountColor()
                            )}>
                                {currencySymbol}{formatAmount(Math.abs(category?.amount || 0))}
                            </p>
                        </div>
                    </div>
                </DialogHeader>
                
                <ScrollArea className="flex-1 px-4 py-4 bg-background/30">
                    <div className="space-y-3 pb-8">
                        {categoryExpenses.map((expense) => (
                            <div key={expense.id} className="flex flex-col gap-2 p-4 rounded-[20px] bg-card border border-border/40 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-grow min-w-0">
                                        <p className="text-[15px] font-semibold truncate leading-tight">
                                            {expense.description || category?.name}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                            <span className="flex items-center gap-1">
                                                {renderIcon(expense.account?.icon, "h-3 w-3")}
                                                {expense.account?.name}
                                            </span>
                                            <span className="opacity-30">&bull;</span>
                                            <span>{format(expense.date, 'h:mm a')}</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className={cn(
                                            "text-[15px] font-bold",
                                            expense.type === 'income' ? "text-[#27AE60]" : "text-[#EB5757]"
                                        )}>
                                            {expense.type === 'income' ? '+' : '-'}{currencySymbol}{formatAmount(expense.amount)}
                                        </p>
                                    </div>
                                </div>

                                {expense.tags && expense.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                        {expense.tags.map(tag => (
                                            <Badge 
                                                key={tag.id} 
                                                variant="outline"
                                                style={generateColorStyle(tag.name)}
                                                className="badge-colorful text-[9px] h-4 px-1.5 font-bold border-none rounded-full"
                                            >
                                                {tag.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {categoryExpenses.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/40">
                                {renderIcon("SearchX", "h-12 w-12 mb-2")}
                                <p className="text-sm font-semibold uppercase tracking-widest">No matching records</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
