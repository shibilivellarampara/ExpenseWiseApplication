
'use client';

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { EnrichedExpense } from "@/lib/types";
import { getCurrencySymbol } from "@/lib/currencies";
import { cn, formatAmount } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface CategoryTransactionsSheetProps {
    category: { id: string; name: string; amount: number } | null;
    expenses: EnrichedExpense[];
    currency?: string;
    onClose: () => void;
}

export function CategoryTransactionsSheet({ category, expenses, currency, onClose }: CategoryTransactionsSheetProps) {
    const currencySymbol = getCurrencySymbol(currency);

    const categoryExpenses = expenses
        .filter(e => (e.category?.id || 'other') === category?.id)
        .sort((a, b) => b.date.getTime() - a.date.getTime());

    return (
        <Drawer open={!!category} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="max-h-[85vh] rounded-t-[32px]">
                <DrawerHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <DrawerTitle className="text-xl font-bold">{category?.name}</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium">
                                {categoryExpenses.length} transactions
                            </DrawerDescription>
                        </div>
                        <div className="text-right">
                            <p className={cn(
                                "text-xl font-bold",
                                (category?.amount || 0) >= 0 ? "text-green-600" : "text-destructive"
                            )}>
                                {currencySymbol}{formatAmount(Math.abs(category?.amount || 0))}
                            </p>
                        </div>
                    </div>
                </DrawerHeader>
                
                <ScrollArea className="flex-1 px-4 pb-8 mt-4">
                    <div className="space-y-4">
                        {categoryExpenses.map((expense) => (
                            <div key={expense.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                <div className="flex-grow min-w-0 pr-4">
                                    <p className="text-sm font-bold truncate">{expense.description || category?.name}</p>
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                        {expense.account?.name} &bull; {format(expense.date, 'MMM d, h:mm a')}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={cn(
                                        "text-sm font-bold",
                                        expense.type === 'income' ? "text-green-600" : "text-destructive"
                                    )}>
                                        {expense.type === 'income' ? '+' : '-'}{currencySymbol}{formatAmount(expense.amount)}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {categoryExpenses.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                No transactions found for this period.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DrawerContent>
        </Drawer>
    );
}
