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
import React, { useState } from 'react';
import { useExpenseForm, ExpenseForm } from './ExpenseForm';
import { EnrichedExpense } from '@/lib/types';

function AddExpenseDialogContent({
    expenseToEdit,
    initialType,
    onSaveSuccess,
    onClose,
}: { 
    expenseToEdit?: EnrichedExpense,
    initialType?: 'income' | 'expense';
    onSaveSuccess?: () => void;
    onClose: () => void;
}) {
    const { 
        form, 
        onFinalSubmit, 
        onSaveAndNewSubmit, 
        handleDelete, 
        isLoading, 
        isEditMode, 
        formId,
    } = useExpenseForm({
        setOpen: onClose, 
        expenseToEdit, 
        initialType,
        onSaveSuccess,
    });

    const FormContent = () => (
        <ExpenseForm form={form} onSubmit={onFinalSubmit} id={formId} />
    );

    const DialogFooterButtons = () => (
        <div className="flex-row justify-between w-full pt-4 flex gap-2">
            <div className="flex items-center">
                {isEditMode ? (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="destructive" disabled={isLoading} size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[24px]">
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
                    <Button type="button" variant="outline" onClick={onClose} size="sm">
                        Cancel
                    </Button>
                )}
            </div>
            <div className="flex gap-2 justify-end">
                 {!isEditMode && (
                    <Button type="button" onClick={onSaveAndNewSubmit} disabled={isLoading} variant="outline" size="sm" className="px-2">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save & New
                    </Button>
                 )}
                 <Button type="submit" form={formId} disabled={isLoading} size="sm" className="min-w-[80px]">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode ? 'Save Changes' : 'Save'}
                </Button>
            </div>
        </div>
    );

    return (
        <>
            <DialogHeader>
                <DialogTitle className="font-headline">{isEditMode ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto -mx-6 px-6 py-2">
                <FormContent />
            </div>
            <DialogFooter>
                <DialogFooterButtons />
            </DialogFooter>
        </>
    );
}


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
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent 
                className="sm:max-w-md w-[calc(100%-2rem)] max-h-[90vh] flex flex-col rounded-[24px]" 
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <AddExpenseDialogContent 
                    expenseToEdit={expenseToEdit} 
                    initialType={initialType} 
                    onSaveSuccess={onSaveSuccess} 
                    onClose={() => setOpen(false)}
                />
            </DialogContent>
        </Dialog>
    );
}
