
'use client';

import { EnrichedFamilyTransaction } from "@/lib/types";
import { format, isToday, isYesterday } from "date-fns";
import { cn, formatAmount } from "@/lib/utils";
import { getCurrencySymbol } from "@/lib/currencies";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { renderIcon } from "@/lib/render-icon";
import { User, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteDocumentNonBlocking } from "@/firebase";

interface WalletTransactionsTableProps {
    transactions: EnrichedFamilyTransaction[];
    walletId: string;
}

export function WalletTransactionsTable({ transactions, walletId }: WalletTransactionsTableProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    const handleDelete = async (txId: string) => {
        if (!confirm("Are you sure you want to delete this transaction?")) return;
        
        try {
            const txRef = doc(firestore, `familyWallets/${walletId}/transactions`, txId);
            await deleteDocumentNonBlocking(txRef);
            toast({ title: "Transaction Deleted" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Delete Failed" });
        }
    };

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-[24px] bg-card/50 text-center">
                <p className="text-muted-foreground">No transactions yet. Start the ledger!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {transactions.map((tx, idx) => {
                const dateLabel = isToday(tx.date) ? "Today" : isYesterday(tx.date) ? "Yesterday" : format(tx.date, 'MMM d, yyyy');
                const showHeader = idx === 0 || format(transactions[idx - 1].date, 'yyyy-MM-dd') !== format(tx.date, 'yyyy-MM-dd');

                return (
                    <div key={tx.id}>
                        {showHeader && (
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 mb-2 mt-4 ml-1">
                                {dateLabel}
                            </h4>
                        )}
                        <div className={cn(
                            "flex items-center gap-4 p-4 rounded-[20px] bg-card border border-border/40 shadow-md hover:shadow-lg transition-all group relative",
                            idx === 0 && "shadow-[0_-8px_24px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)]"
                        )}>
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                {renderIcon(tx.category?.icon, "h-6 w-6")}
                            </div>

                            <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-sm truncate text-foreground/90">
                                            {tx.description || tx.category?.name || "Transaction"}
                                        </h4>
                                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                            <span className="flex items-center gap-1">
                                                <User className="h-2.5 w-2.5" />
                                                {tx.authorName}
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-2.5 w-2.5" />
                                                {format(tx.date, 'HH:mm')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={cn(
                                            "font-bold text-[15px] leading-none",
                                            tx.type === 'income' ? "text-primary" : "text-destructive"
                                        )}>
                                            {tx.type === 'income' ? '+' : '-'}{currencySymbol}{formatAmount(tx.amount)}
                                        </p>
                                        <p className="text-[10px] font-bold text-muted-foreground/40 mt-1.5">
                                            Bal: {currencySymbol}{formatAmount(tx.runningBalance || 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Delete Action (visible on hover) */}
                            <div className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                    variant="destructive" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-full shadow-lg"
                                    onClick={() => handleDelete(tx.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
