

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
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
} from "@/components/ui/alert-dialog"

import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { EnrichedExpense } from '@/lib/types';
import { useExpenseForm, ExpenseForm } from './ExpenseForm';


export function AddExpenseDialog({ 
    children, 
    expenseToEdit,
    initialType,
    onSaveSuccess,
}: { 
    children: React.ReactNode, 
    expenseToEdit?: EnrichedExpense,
    initialType?: 'income' | 'expense';
    onSaveSuccess?: () => void;
}) {
    const [open, setOpen] = useState(false);
    
    const { 
        form, 
        onFinalSubmit, 
        onSaveAndNewSubmit, 
        handleDelete, 
        isLoading, 
        isEditMode, 
        formId,
        accounts,
        categories,
        tags
    } = useExpenseForm({
        setOpen, 
        expenseToEdit, 
        initialType,
        open,
        onSaveSuccess,
    });
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="font-headline">{isEditMode ? 'Edit Transaction' : 'Add a New Transaction'}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <ExpenseForm 
                        form={form} 
                        onSubmit={onFinalSubmit} 
                        id={formId}
                        accounts={accounts}
                        categories={categories}
                        tags={tags}
                    />
                </div>
                 <DialogFooter className="flex-row justify-between w-full">
                    <div className="flex items-center">
                        {isEditMode ? (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" variant="destructive" disabled={isLoading}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete this transaction.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : (
                             <DialogClose asChild>
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </DialogClose>
                        )}
                    </div>
                    <div className="flex gap-2 justify-end">
                         {!isEditMode && (
                            <Button type="button" onClick={onSaveAndNewSubmit} disabled={isLoading} variant="outline" className="min-w-[120px]">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save & New
                            </Button>
                         )}
                         <Button type="submit" form={formId} disabled={isLoading} className="min-w-[120px]">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? 'Save Changes' : 'Save'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
