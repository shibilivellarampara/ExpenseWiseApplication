
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EnrichedBudget, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { useDoc, useFirestore, useUser, useMemoFirebase, deleteDocumentNonBlocking } from "@/firebase";
import { doc } from 'firebase/firestore';
import { getCurrencySymbol } from "@/lib/currencies";
import * as LucideIcons from 'lucide-react';
import { cn } from "@/lib/utils";
import { Progress } from "../ui/progress";
import { MoreVertical, Edit, Trash2, Pilcrow, Target } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { useState } from "react";
import { AddBudgetSheet } from "./AddBudgetSheet";

interface BudgetsListProps {
    budgets: EnrichedBudget[];
    isLoading?: boolean;
}

const renderIcon = (iconName: string | undefined, className?: string) => {
  if (!iconName) return <Pilcrow className={cn("h-6 w-6 text-muted-foreground", className)} />;
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent ? <IconComponent className={cn("h-6 w-6 text-muted-foreground", className)} /> : <Pilcrow className={cn("h-6 w-6 text-muted-foreground", className)} />;
};

function DeleteBudgetButton({ budget, onComplete }: { budget: EnrichedBudget, onComplete: () => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!user || !firestore) return;
        setIsDeleting(true);
        const budgetRef = doc(firestore, `users/${user.uid}/budgets`, budget.id);
        await deleteDocumentNonBlocking(budgetRef);
        onComplete();
        setIsDeleting(false);
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the budget for "{budget.category?.name}". This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <LucideIcons.Loader2 className="animate-spin" /> : 'Yes, delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function BudgetsList({ budgets, isLoading }: BudgetsListProps) {
    const { user } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                     <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                        </CardHeader>
                        <CardContent>
                           <Skeleton className="h-8 w-full mb-2" />
                           <Skeleton className="h-4 w-1/2" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (budgets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                <Target className="h-12 w-12 text-muted-foreground mb-4"/>
                <h3 className="text-xl font-semibold">No Budgets Set</h3>
                <p className="text-muted-foreground mt-2">Click "Add Budget" to create your first monthly budget.</p>
            </div>
        );
    }
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {budgets.map(item => {
                const percentage = item.amount > 0 ? (item.spentAmount / item.amount) * 100 : 0;
                const isOverBudget = percentage > 100;
                
                return (
                    <Card key={item.id}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                {renderIcon(item.category?.icon, "h-6 w-6")}
                                <CardTitle>{item.category?.name || 'Uncategorized'}</CardTitle>
                            </div>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <AddBudgetSheet budgetToEdit={item} allCategories={[]} existingBudgets={[]}>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </DropdownMenuItem>
                                    </AddBudgetSheet>
                                    <DeleteBudgetButton budget={item} onComplete={() => {}} />
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <Progress value={Math.min(percentage, 100)} className={cn(isOverBudget && "[&>div]:bg-destructive")} />
                             <div className="flex justify-between text-sm">
                                <span className={cn("font-medium", isOverBudget && "text-destructive")}>
                                    {currencySymbol}{item.spentAmount.toFixed(2)}
                                </span>
                                <span className="text-muted-foreground">
                                    / {currencySymbol}{item.amount.toFixed(2)}
                                </span>
                            </div>
                            {isOverBudget && (
                                <p className="text-xs text-destructive font-semibold">
                                    You are {currencySymbol}{(item.spentAmount - item.amount).toFixed(2)} over budget!
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
