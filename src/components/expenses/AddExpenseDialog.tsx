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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
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
import { useMediaQuery } from '@/hooks/use-media-query';

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

    const isMobile = useMediaQuery("(max-width: 640px)");
    
    const FormContent = () => (
        <ExpenseForm form={form} onSubmit={onFinalSubmit} id={formId} />
    );

    const DialogOrDrawerFooter = () => (
        <div className="flex-row justify-between w-full pt-4 flex">
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
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
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
        </div>
    );

    if (isMobile) {
        return (
            <div className="px-4">
                 <DrawerHeader className="p-0 text-left">
                    <DrawerTitle className="font-headline">{isEditMode ? 'Edit Transaction' : 'Add Transaction'}</DrawerTitle>
                </DrawerHeader>
                 <div className="overflow-y-auto mt-4">
                    <FormContent />
                </div>
                 <DrawerFooter className="pt-2">
                    <DialogOrDrawerFooter />
                 </DrawerFooter>
            </div>
        );
    }
    
    return (
        <>
            <DialogHeader>
                <DialogTitle className="font-headline">{isEditMode ? 'Edit Transaction' : 'Add a New Transaction'}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
                <FormContent />
            </div>
            <DialogFooter>
                <DialogOrDrawerFooter />
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
    const isMobile = useMediaQuery("(max-width: 640px)");
    
    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>{children}</DrawerTrigger>
                <DrawerContent>
                     <AddExpenseDialogContent 
                        expenseToEdit={expenseToEdit} 
                        initialType={initialType} 
                        onSaveSuccess={onSaveSuccess} 
                        onClose={() => setOpen(false)}
                    />
                </DrawerContent>
            </Drawer>
        );
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
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