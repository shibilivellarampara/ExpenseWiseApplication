'use client';

import { RecurringExpense, UserProfile, Account, Category } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreVertical, Edit, Trash2, Pause, Play, Loader2, Calendar } from 'lucide-react';
import { useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { getCurrencySymbol } from '@/lib/currencies';
import { cn, formatAmount } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AddRecurringDialog } from './AddRecurringDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useState } from 'react';

interface RecurringListProps {
    items: RecurringExpense[];
    isLoading?: boolean;
}

export function RecurringList({ items, isLoading }: RecurringListProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    const toggleStatus = async (item: RecurringExpense) => {
        if (!user || !firestore) return;
        const newStatus = item.status === 'active' ? 'paused' : 'active';
        setActionLoading(item.id);
        try {
            const docRef = doc(firestore, `users/${user.uid}/recurringExpenses`, item.id);
            await setDocumentNonBlocking(docRef, { status: newStatus }, { merge: true });
            toast({ title: `Item ${newStatus === 'active' ? 'activated' : 'paused'}` });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed to update status' });
        } finally {
            setActionLoading(null);
        }
    };

    const deleteItem = async (itemId: string) => {
        if (!user || !firestore) return;
        try {
            const docRef = doc(firestore, `users/${user.uid}/recurringExpenses`, itemId);
            await deleteDocumentNonBlocking(docRef);
            toast({ title: 'Recurring item deleted' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed to delete item' });
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-2xl bg-card/50">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No Recurring Items</h3>
                <p className="text-muted-foreground mt-1">Add subscriptions or regular bills to track them automatically.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {items.map((item) => (
                <Card key={item.id} className={cn("rounded-2xl border-none shadow-sm transition-opacity", item.status === 'paused' && "opacity-60")}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-base truncate">{item.name}</h3>
                                    <Badge variant="outline" className="capitalize text-[10px] py-0 px-1.5 h-4 font-bold border-primary/20 text-primary bg-primary/5">
                                        {item.frequency}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                    {item.description || `Next due: ${new Date((item.nextDueDate as any).toDate()).toLocaleDateString()}`}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <div className={cn("font-bold text-lg", item.type === 'income' ? "text-green-600" : "text-foreground")}>
                                    {item.type === 'income' ? '+' : ''}{currencySymbol}{formatAmount(item.amount)}
                                </div>
                                <div className="flex items-center justify-end gap-1 mt-1">
                                    <Badge className={cn(
                                        "text-[10px] h-4 px-1.5 font-bold uppercase tracking-wider",
                                        item.status === 'active' ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                                    )}>
                                        {item.status}
                                    </Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl">
                                            <AddRecurringDialog itemToEdit={item}>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                            </AddRecurringDialog>
                                            <DropdownMenuItem onClick={() => toggleStatus(item)}>
                                                {item.status === 'active' ? (
                                                    <><Pause className="mr-2 h-4 w-4" /> Pause</>
                                                ) : (
                                                    <><Play className="mr-2 h-4 w-4" /> Resume</>
                                                )}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="rounded-3xl">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete recurring item?</AlertDialogTitle>
                                                        <AlertDialogDescription>This will stop future tracking for this item. Existing transactions won't be affected.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteItem(item.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
