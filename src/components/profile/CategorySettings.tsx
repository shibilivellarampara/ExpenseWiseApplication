
'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase, errorEmitter, FirestorePermissionError, setDocumentNonBlocking } from '@/firebase';
import { Category } from '@/lib/types';
import { collection, doc, writeBatch, query, getDocs, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2, Edit, Check, X, Pilcrow, Merge, Archive, Eye, EyeOff, RotateCw, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { availableIcons } from '@/lib/defaults';
import * as LucideIcons from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { MergeItemsDialog } from '@/components/profile/MergeItemsDialog';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle as DialogTitlePrimitive, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';

export function CategorySettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const categoriesQuery = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/categories`) : null
        , [firestore, user]);

    const { data: categories, isLoading } = useCollection<Category>(categoriesQuery);
    
    const [newItemName, setNewItemName] = useState('');
    const [newItemIcon, setNewItemIcon] = useState('Shapes');
    const [editingItem, setEditingItem] = useState<{ id: string; name: string; icon: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
    const [editIconPopoverOpen, setEditIconPopoverOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showMergeDialog, setShowMergeDialog] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectionMode, setSelectionMode] = useState(false);


    const SYSTEM_CATEGORIES = ['Credit Limit Upgrade', 'Credit Card Payment', 'Credit Limit Downgrade'];

    const renderIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="h-5 w-5" /> : <Pilcrow className="h-5 w-5" />;
    };
    
    const handleAddItem = async () => {
        if (!newItemName || !user || !firestore) return;

        const isDuplicate = categories?.some(c => c.name.toLowerCase() === newItemName.toLowerCase());
        if (isDuplicate) {
            toast({
                variant: 'destructive',
                title: 'Duplicate Category',
                description: `A category named "${newItemName}" already exists.`,
            });
            return;
        }

        setIsSaving(true);
        const ref = collection(firestore, `users/${user.uid}/categories`);
        const newDocRef = doc(ref);
        const categoryData = { id: newDocRef.id, name: newItemName, icon: newItemIcon, userId: user.uid, status: 'active' };
        
        try {
            await setDocumentNonBlocking(newDocRef, categoryData);
            toast({ title: 'Category Added' });
            setNewItemName('');
            setNewItemIcon('Shapes');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleUpdateItem = async () => {
        if (!editingItem || !user || !firestore) return;

        const isSystemCategory = SYSTEM_CATEGORIES.includes(categories?.find(c => c.id === editingItem.id)?.name || '');
        
        if (!isSystemCategory) {
            const isDuplicate = categories?.some(c =>
                c.name.toLowerCase() === editingItem.name.toLowerCase() && c.id !== editingItem.id
            );

            if (isDuplicate) {
                toast({
                    variant: 'destructive',
                    title: 'Duplicate Category',
                    description: `A category named "${editingItem.name}" already exists.`,
                });
                return;
            }
        }


        setIsSaving(true);
        const itemRef = doc(firestore, `users/${user.uid}/categories`, editingItem.id);
        const updatedData: { name?: string; icon: string } = { icon: editingItem.icon };

        if (!isSystemCategory) {
            updatedData.name = editingItem.name;
        }

        try {
            await setDocumentNonBlocking(itemRef, updatedData, { merge: true });
            toast({ title: "Category Updated" });
            setEditingItem(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!user || !firestore) return;

        const itemToRemove = categories?.find(i => i.id === itemId);
        if (SYSTEM_CATEGORIES.includes(itemToRemove?.name || '')) {
            toast({ variant: 'destructive', title: 'Action Not Allowed', description: `"${itemToRemove?.name}" is a system category and cannot be removed.` });
            return;
        }

        setIsSaving(true);
        const itemRef = doc(firestore, `users/${user.uid}/categories`, itemId);
        
        const batch = writeBatch(firestore);
        batch.delete(itemRef);

        batch.commit()
            .catch(async (serverError) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: itemRef.path,
                    operation: 'delete',
                }));
            })
            .finally(() => {
                toast({ title: 'Category Removed' });
                setIsSaving(false);
            });
    };

    const handleUpdateStatus = (itemId: string, status: 'active' | 'inactive') => {
        if (!user || !firestore) return;
    
        const item = categories?.find(c => c.id === itemId);
        if (SYSTEM_CATEGORIES.includes(item?.name || '')) {
            toast({ variant: 'destructive', title: 'Action Not Allowed', description: `"${item?.name}" is a system category and cannot be archived.` });
            return;
        }
    
        setIsSaving(true);
        const itemRef = doc(firestore, `users/${user.uid}/categories`, itemId);
        setDocumentNonBlocking(itemRef, { status: status }, { merge: true })
            .then(() => {
                toast({ title: `Category ${status === 'active' ? 'Restored' : 'Archived'}` });
            })
            .catch((err) => {
                 toast({ variant: 'destructive', title: 'Error', description: err.message });
            })
            .finally(() => {
                setIsSaving(false);
            });
    }

    const handleMerge = async (target: { id: string } | { name: string; icon: string }) => {
        if (!user || !firestore || selectedIds.length < 2) return;
        setIsSaving(true);
    
        try {
            const batch = writeBatch(firestore);
            let targetId: string;
    
            if ('name' in target) {
                const newCatRef = doc(collection(firestore, `users/${user.uid}/categories`));
                targetId = newCatRef.id;
                batch.set(newCatRef, { ...target, id: targetId, userId: user.uid });
            } else {
                targetId = target.id;
            }
    
            const sourceIds = selectedIds.filter(id => id !== targetId);
    
            const expensesRef = collection(firestore, `users/${user.uid}/expenses`);
            const q = query(expensesRef, where('categoryId', 'in', sourceIds));
            const expensesToUpdateSnapshot = await getDocs(q);
    
            expensesToUpdateSnapshot.forEach(doc => {
                const expenseRef = doc.ref;
                batch.update(expenseRef, { categoryId: targetId });
            });
    
            sourceIds.forEach(id => {
                const catRef = doc(firestore, `users/${user.uid}/categories`, id);
                batch.delete(catRef);
            });
    
            await batch.commit();
            toast({ title: "Merge Complete", description: `${selectedIds.length} categories merged successfully.` });
            setSelectedIds([]);
            setShowMergeDialog(false);
            setSelectionMode(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Merge Failed", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    
    const { activeCategories, inactiveCategories } = useMemo(() => {
        const filtered = (categories || []).filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return filtered.reduce((acc, category) => {
            if (category.status === 'inactive') {
                acc.inactiveCategories.push(category);
            } else {
                acc.activeCategories.push(category);
            }
            return acc;
        }, { activeCategories: [] as Category[], inactiveCategories: [] as Category[] });
    }, [categories, searchQuery]);


    activeCategories.sort((a,b) => a.name.localeCompare(b.name));
    inactiveCategories.sort((a,b) => a.name.localeCompare(b.name));


    const handleSelectionChange = (id: string, checked: boolean | string) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => {
                const newIds = prev.filter(i => i !== id);
                if (newIds.length === 0) setSelectionMode(false);
                return newIds;
            });
        }
    };
    
    const toggleSelectionMode = (startWithId?: string) => {
        if (selectionMode) {
            setSelectionMode(false);
            setSelectedIds([]);
        } else if (startWithId) {
            setSelectionMode(true);
            setSelectedIds([startWithId]);
        }
    };
    
    const handleSelectAll = () => {
        if (selectedIds.length === activeCategories.length) {
            setSelectedIds([]);
        } else {
            const allActiveIds = activeCategories.filter(c => !SYSTEM_CATEGORIES.includes(c.name)).map(c => c.id);
            setSelectedIds(allActiveIds);
        }
    };


    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="space-y-4">
                     <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search categories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                     <div className="flex items-center gap-2">
                        <Popover open={iconPopoverOpen} onOpenChange={setIconPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-14 h-10 shrink-0">
                                    {renderIcon(newItemIcon)}
                                </Button>
                            </PopoverTrigger>
                           <PopoverContent className="w-auto p-0">
                                <ScrollArea className="h-72">
                                    <div className="grid grid-cols-5 gap-2 p-4">
                                        {availableIcons.map(iconName => (
                                            <Button key={iconName} variant="ghost" size="icon" onClick={() => { setNewItemIcon(iconName); setIconPopoverOpen(false); }}>
                                                {renderIcon(iconName)}
                                            </Button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>
                        <Input
                            placeholder="New Category Name"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                            className="flex-grow h-10"
                        />
                         <Button onClick={handleAddItem} disabled={isSaving || !newItemName} className="w-auto h-10 px-4">
                            {isSaving ? <Loader2 className="animate-spin" /> : 'Add'}
                        </Button>
                    </div>
                </CardHeader>
                 <CardContent className="space-y-2">
                     {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <>
                            {selectionMode && (
                                <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                                     <div className="flex items-center gap-2">
                                        <Checkbox 
                                            id="select-all"
                                            checked={selectedIds.length === activeCategories.filter(c => !SYSTEM_CATEGORIES.includes(c.name)).length && activeCategories.length > 0}
                                            onCheckedChange={handleSelectAll}
                                        />
                                        <Label htmlFor="select-all" className="text-sm font-medium">{selectedIds.length} selected</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                         <MergeItemsDialog
                                            open={showMergeDialog}
                                            onOpenChange={setShowMergeDialog}
                                            items={categories?.filter(c => selectedIds.includes(c.id)) || []}
                                            itemType="Category"
                                            onMerge={handleMerge}
                                            isSaving={isSaving}
                                        >
                                            <Button variant="ghost" size="sm" disabled={selectedIds.length < 2}>
                                                <Merge className="mr-2 h-4 w-4" /> Merge
                                            </Button>
                                        </MergeItemsDialog>
                                         <Button variant="ghost" size="sm" onClick={() => toggleSelectionMode()}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activeCategories.map((item) => {
                                 const isSystemCategory = SYSTEM_CATEGORIES.includes(item.name);
                                return (
                                <div key={item.id}>
                                    <div className={cn("flex items-center gap-2 p-2 rounded-md", selectionMode && !isSystemCategory && "cursor-pointer hover:bg-muted/50")} onClick={() => selectionMode && !isSystemCategory && handleSelectionChange(item.id, !selectedIds.includes(item.id))}>
                                         {selectionMode ? (
                                            <Checkbox
                                                id={`select-cat-${item.id}`}
                                                checked={selectedIds.includes(item.id)}
                                                onCheckedChange={(checked) => handleSelectionChange(item.id, checked)}
                                                disabled={isSaving || isSystemCategory}
                                                className={cn(isSystemCategory && "opacity-50 cursor-not-allowed")}
                                            />
                                        ) : (
                                            <button onClick={() => !isSystemCategory && toggleSelectionMode(item.id)} disabled={isSystemCategory}>
                                                {renderIcon(item.icon)}
                                            </button>
                                        )}

                                        {editingItem?.id === item.id ? (
                                            <div className="flex w-full items-center gap-2">
                                                <Popover open={editIconPopoverOpen} onOpenChange={setEditIconPopoverOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                                                            {renderIcon(editingItem.icon)}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <ScrollArea className="h-72">
                                                            <div className="grid grid-cols-5 gap-2 p-4">
                                                                {availableIcons.map(iconName => (
                                                                    <Button key={iconName} variant="ghost" size="icon" onClick={() => { setEditingItem({ ...editingItem, icon: iconName }); setEditIconPopoverOpen(false); }}>
                                                                        {renderIcon(iconName)}
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        </ScrollArea>
                                                    </PopoverContent>
                                                </Popover>
                                                <Input
                                                    value={editingItem.name}
                                                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                                    className="h-10 text-[15px] flex-grow"
                                                    disabled={isSystemCategory}
                                                />
                                                <Button size="icon" className="h-10 w-10 shrink-0" onClick={handleUpdateItem}>
                                                    {isSaving ? <Loader2 className="animate-spin" /> : <Check />}
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" onClick={() => setEditingItem(null)}>
                                                    <X />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center flex-1 gap-2">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className={cn(
                                                                    "text-[15px]",
                                                                    isSystemCategory && "text-muted-foreground italic cursor-default"
                                                                )}>
                                                                    {item.name}
                                                                </span>
                                                            </TooltipTrigger>
                                                            {isSystemCategory && (
                                                                <TooltipContent>
                                                                    <p>System category. Name cannot be changed.</p>
                                                                </TooltipContent>
                                                            )}
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                                <Button variant="ghost" size="icon" type="button" onClick={() => setEditingItem(item)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                 <Button variant="ghost" size="icon" type="button" onClick={() => handleUpdateStatus(item.id, 'inactive')} disabled={isSystemCategory}>
                                                    <Archive className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" type="button" disabled={isSystemCategory}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the "{item.name}" category.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleRemoveItem(item.id)} className="bg-destructive hover:bg-destructive/90">
                                                                {isSaving ? <Loader2 className="animate-spin" /> : "Delete"}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </>
                                        )}
                                    </div>
                                </div>
                                );
                            })}
                             {activeCategories.length === 0 && searchQuery && (
                                <p className="text-center text-sm text-muted-foreground py-4">No categories match your search.</p>
                            )}
                         </>
                    )}
                 </CardContent>
            </Card>

             {inactiveCategories.length > 0 && (
                <Collapsible open={showArchived} onOpenChange={setShowArchived}>
                    <Separator className="my-4"/>
                    <CollapsibleTrigger asChild>
                        <button className="flex w-full items-center justify-between p-2 text-sm font-medium text-muted-foreground">
                            <span>View {inactiveCategories.length} archived categories</span>
                             {showArchived ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 p-2 pt-0">
                        {inactiveCategories.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                <div className="flex items-center gap-2">
                                    {renderIcon(item.icon)}
                                    <span className="text-muted-foreground text-sm">{item.name}</span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(item.id, 'active')} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
                                    Restore
                                </Button>
                            </div>
                        ))}
                    </CollapsibleContent>
                </Collapsible>
            )}
        </div>
    );
}
