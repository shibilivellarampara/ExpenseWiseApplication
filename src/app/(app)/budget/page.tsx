
'use client';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { getCurrencySymbol } from '@/lib/currencies';
import { renderIcon } from '@/lib/render-icon';
import { Budget, Category, Expense, UserProfile } from '@/lib/types';
import { collection, doc, query, where, Timestamp } from 'firebase/firestore';
import { addMonths, format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Edit, Loader2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface BudgetWithDetails extends Budget {
  category?: Category;
  spent: number;
  remaining: number;
  percentage: number;
}

function EditBudgetDialog({ budget, category, period, currencySymbol }: { budget?: Budget, category: Category, period: string, currencySymbol: string }) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState<number | string>(budget?.amount || '');
    const [isSaving, setIsSaving] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleSave = async () => {
        if (!user || !firestore) return;
        
        const budgetAmount = Number(amount);
        if (isNaN(budgetAmount) || budgetAmount < 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount' });
            return;
        }

        setIsSaving(true);
        const budgetId = `${period}_${category.id}`;
        const budgetRef = doc(firestore, `users/${user.uid}/budgets`, budgetId);

        try {
            await setDocumentNonBlocking(budgetRef, {
                id: budgetId,
                userId: user.uid,
                period,
                categoryId: category.id,
                amount: budgetAmount,
                updatedAt: new Date(),
            }, { merge: true });
            toast({ title: 'Budget Saved!' });
            setOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error saving budget', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Set Budget for {category.name}</DialogTitle>
                    <DialogDescription>Set your monthly budget for the period {format(new Date(period), 'MMMM yyyy')}.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="budget-amount">Budget Amount ({currencySymbol})</Label>
                    <Input
                        id="budget-amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="e.g., 500"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Budget
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function BudgetPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const { user } = useUser();
    const firestore = useFirestore();

    const period = format(currentMonth, 'yyyy-MM');
    
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const categoriesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/categories`), where('status', '!=', 'inactive')) : null, [user, firestore]);
    const budgetsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/budgets`), where('period', '==', period)) : null, [user, firestore]);
    const expensesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/expenses`), where('date', '>=', startOfMonth(currentMonth)), where('date', '<=', endOfMonth(currentMonth))) : null, [user, firestore]);

    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);
    const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);

    const isLoading = profileLoading || categoriesLoading || budgetsLoading || expensesLoading;

    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);
    
    const budgetsWithDetails: BudgetWithDetails[] = useMemo(() => {
        if (!categories) return [];

        const expenseByCategory = new Map<string, number>();
        expenses?.filter(e => e.type === 'expense').forEach(expense => {
            if (expense.categoryId) {
                expenseByCategory.set(expense.categoryId, (expenseByCategory.get(expense.categoryId) || 0) + expense.amount);
            }
        });
        
        const budgetMap = new Map<string, Budget>(budgets?.map(b => [b.categoryId, b]));

        return categories
          .map(category => {
            const budget = budgetMap.get(category.id);
            const spent = expenseByCategory.get(category.id) || 0;
            const budgetAmount = budget?.amount || 0;
            const remaining = budgetAmount - spent;
            const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
            
            if (budgetAmount === 0 && spent === 0) return null;

            return {
                ...(budget || {
                    id: `${period}_${category.id}`,
                    userId: user!.uid,
                    period: period,
                    categoryId: category.id,
                    amount: 0,
                }),
                category,
                spent,
                remaining,
                percentage,
            };
        }).filter((b): b is BudgetWithDetails => b !== null)
          .sort((a,b) => (b.amount > 0 ? 1 : 0) - (a.amount > 0 ? 1 : 0) || b.spent - a.spent);

    }, [categories, budgets, expenses, user, period]);
    
    const { totalBudget, totalSpent, totalRemaining } = useMemo(() => {
        return budgetsWithDetails.reduce((acc, b) => {
            acc.totalBudget += b.amount;
            acc.totalSpent += b.spent;
            return acc;
        }, { totalBudget: 0, totalSpent: 0, totalRemaining: 0 });
    }, [budgetsWithDetails]);

    const changeMonth = (amount: number) => {
        setCurrentMonth(prev => amount > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
    };

    return (
        <div className="w-full space-y-8">
            <PageHeader title="Budgets" description="Manage your monthly and category-wise budgets." />
            
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                         <CardTitle className='font-headline'>
                            {format(currentMonth, 'MMMM yyyy')}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                     <CardDescription>
                       Total Budget: {currencySymbol}{totalBudget.toFixed(2)}
                    </CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm text-muted-foreground mb-1">
                            <span>Spent: {currencySymbol}{totalSpent.toFixed(2)}</span>
                            <span>Remaining: {currencySymbol}{(totalBudget - totalSpent).toFixed(2)}</span>
                        </div>
                        <Progress value={totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0} />
                    </div>

                    <div className="space-y-4 pt-4">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-5 w-1/3" />
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            ))
                        ) : budgetsWithDetails.length > 0 ? (
                           budgetsWithDetails.map(item => (
                               <div key={item.id} className="space-y-2">
                                   <div className="flex justify-between items-center">
                                       <div className="flex items-center gap-2 font-medium">
                                           {renderIcon(item.category?.icon)}
                                           {item.category?.name}
                                       </div>
                                       <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">
                                                {currencySymbol}{item.spent.toFixed(2)} / {currencySymbol}{item.amount.toFixed(2)}
                                            </span>
                                            <EditBudgetDialog budget={item} category={item.category!} period={period} currencySymbol={currencySymbol} />
                                       </div>
                                   </div>
                                    <Progress value={item.percentage} className={item.percentage > 100 ? '[&>div]:bg-destructive' : ''} />
                                    <p className="text-xs text-right text-muted-foreground">
                                        {item.remaining >= 0 ? `${currencySymbol}${item.remaining.toFixed(2)} remaining` : `${currencySymbol}${Math.abs(item.remaining).toFixed(2)} overspent`}
                                    </p>
                               </div>
                           ))
                        ) : (
                             <div className="text-center py-8 text-muted-foreground">
                                <p>No budgets set for this month.</p>
                                <p className="text-xs">Click the edit icon on a category to set a budget.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
