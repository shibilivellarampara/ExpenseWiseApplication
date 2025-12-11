

'use client';

import { useCollection, useFirestore, useUser, useMemoFirebase, errorEmitter, FirestorePermissionError, setDocumentNonBlocking } from '@/firebase';
import { Category, Expense } from '@/lib/types';
import { collection, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2, Edit, Check, X, Pilcrow, ChevronDown, Merge, Archive, Eye, EyeOff, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { availableIcons } from '@/lib/defaults';
import * as LucideIcons from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { MergeItemsDialog } from './MergeItemsDialog';
import { Separator } from '../ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';


export function CategorySettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const categoriesQuery = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/categories`) : null
    , [firestore, user]);

    const { data: categories, isLoading } = useCollection<Category>(categoriesQuery);

    const [newItem, setNewItem] = useState<{name: string, icon: string}>({ name: '', icon: 'Shapes' });
    const [editingItem, setEditingItem] = useState<{ id: string; name: string; icon: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showMergeDialog, setShowMergeDialog] = useState(false);
    const [newItemPopoverOpen, setNewItemPopoverOpen] = useState(false);
    const [editingItemPopoverOpen, setEditingItemPopoverOpen] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    const SYSTEM_CATEGORIES = ['Credit Limit Upgrade', 'Credit Card Payment', 'Credit Limit Downgrade'];

    const renderIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="h-5 w-5" /> : <Pilcrow className="h-5 w-5" />;
    };

    const handleAddItem = async () => {
        if (!newItem.name || !user || !firestore) return;
        
        if (categories?.some(c => c.name.toLowerCase() === newItem.name.toLowerCase())) {
            toast({
                variant: 'destructive',
                title: 'Duplicate Category',
                description: `A category named "${newItem.name}" already exists.`,
            });
            return;
        }
        
        setIsSaving(true);
        const ref = collection(firestore, `users/${user.uid}/categories`);
        const newDocRef = doc(ref);
        const categoryData = { id: newDocRef.id, name: newItem.name, icon: newItem.icon, userId: user.uid, status: 'active' };

        setDocumentNonBlocking(newDocRef, categoryData)
            .then(() => {
                setNewItem({ name: '', icon: 'Shapes' });
                toast({ title: 'Category Added' });
            })
            .catch(async (serverError) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: newDocRef.path,
                    operation: 'create',
                    requestResourceData: categoryData,
                }));
            })
            .finally(() => {
                 setIsSaving(false);
            });
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
            .then(() => {
                toast({ title: 'Category Removed' });
            })
            .catch(async (serverError) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: itemRef.path,
                    operation: 'delete',
                }));
            })
            .finally(() => {
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

        const itemRef = doc(firestore, `users/${user.uid}/categories`, itemId);
        setDocumentNonBlocking(itemRef, { status: status }, { merge: true }).then(() => {
            toast({ title: `Category ${status === 'active' ? 'Restored' : 'Archived'}` });
        }).catch((err) => {
             toast({ variant: 'destructive', title: 'Error', description: err.message });
        });
    }

    const handleSaveEdit = async () => {
        if (!editingItem || !user || !firestore) return;

        const originalItem = categories?.find(i => i.id === editingItem.id);
        if (SYSTEM_CATEGORIES.includes(originalItem?.name || '')) {
            toast({ variant: 'destructive', title: 'Action Not Allowed', description: `"${originalItem?.name}" is a system category and cannot be edited.` });
            setEditingItem(null);
            return;
        }
        
        if (categories?.some(c => c.id !== editingItem.id && c.name.toLowerCase() === editingItem.name.toLowerCase())) {
            toast({
                variant: 'destructive',
                title: 'Duplicate Category',
                description: `A category named "${editingItem.name}" already exists.`,
            });
            return;
        }


        setIsSaving(true);
        const itemRef = doc(firestore, `users/${user.uid}/categories`, editingItem.id);
        const updatedData = { name: editingItem.name, icon: editingItem.icon };

        setDocumentNonBlocking(itemRef, updatedData, { merge: true })
            .then(() => {
                toast({ title: "Category Updated" });
            })
            .catch(async (serverError) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: itemRef.path,
                    operation: 'update',
                    requestResourceData: updatedData,
                }));
            })
            .finally(() => {
                 setEditingItem(null);
                 setIsSaving(false);
            });
    };

    const handleMerge = async (target: { id: string } | { name: string; icon: string }) => {
        if (!user || !firestore || selectedIds.length < 2) return;
        setIsSaving(true);
    
        try {
            const batch = writeBatch(firestore);
            let targetId: string;
    
            // Step 1: Determine target ID (create new category if necessary)
            if ('name' in target) {
                const newCatRef = doc(collection(firestore, `users/${user.uid}/categories`));
                targetId = newCatRef.id;
                batch.set(newCatRef, { ...target, id: targetId, userId: user.uid });
            } else {
                targetId = target.id;
            }
    
            const sourceIds = selectedIds.filter(id => id !== targetId);
    
            // Step 2: Find all transactions using source categories
            const expensesRef = collection(firestore, `users/${user.uid}/expenses`);
            const q = query(expensesRef, where('categoryId', 'in', sourceIds));
            const expensesToUpdateSnapshot = await getDocs(q);
    
            // Step 3: Update transactions
            expensesToUpdateSnapshot.forEach(doc => {
                const expenseRef = doc.ref;
                batch.update(expenseRef, { categoryId: targetId });
            });
    
            // Step 4: Delete source categories
            sourceIds.forEach(id => {
                const catRef = doc(firestore, `users/${user.uid}/categories`, id);
                batch.delete(catRef);
            });
    
            await batch.commit();
            toast({ title: "Merge Complete", description: `${selectedIds.length} categories merged successfully.` });
            setSelectedIds([]);
            setShowMergeDialog(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Merge Failed", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    
    const { activeCategories, inactiveCategories } = (categories || []).reduce((acc, category) => {
        if (category.status === 'inactive') {
            acc.inactiveCategories.push(category);
        } else {
            acc.activeCategories.push(category);
        }
        return acc;
    }, { activeCategories: [] as Category[], inactiveCategories: [] as Category[] });

    activeCategories.sort((a,b) => a.name.localeCompare(b.name));
    inactiveCategories.sort((a,b) => a.name.localeCompare(b.name));


    const handleSelectionChange = (id: string, checked: boolean | string) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id));
        }
    };
    
    const lastSelectedIndex = activeCategories.reduce((lastIndex, item, currentIndex) => {
        return selectedIds.includes(item.id) ? currentIndex : lastIndex;
    }, -1);


    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                     <CardHeader className="flex flex-row items-center justify-between cursor-pointer p-4">
                        <div>
                            <h3 className="text-base font-semibold font-headline">Categories</h3>
                            <CardDescription className="text-sm">Manage your expense categories.</CardDescription>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="space-y-4 pt-0 p-4">
                        {isLoading ? (
                            <div className="flex justify-center"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="select-all-categories"
                                        checked={selectedIds.length === activeCategories.length && activeCategories.length > 0}
                                        onCheckedChange={(checked) => setSelectedIds(checked ? activeCategories.map(c => c.id) : [])}
                                    />
                                    <label htmlFor="select-all-categories" className="text-sm font-medium">Select All</label>
                                </div>
                                {activeCategories.map((item, index) => (
                                    <div key={item.id}>
                                        <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                                            <Checkbox
                                                id={`select-cat-${item.id}`}
                                                checked={selectedIds.includes(item.id)}
                                                onCheckedChange={(checked) => handleSelectionChange(item.id, checked)}
                                                disabled={isSaving}
                                            />
                                            {editingItem?.id === item.id ? (
                                                <div className="flex items-center gap-2 w-full">
                                                    <Popover open={editingItemPopoverOpen} onOpenChange={setEditingItemPopoverOpen}>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="outline" size="icon" className="shrink-0">{renderIcon(editingItem.icon)}</Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto grid grid-cols-5 gap-2">
                                                            {availableIcons.map(icon => (
                                                                <Button key={icon} variant="ghost" size="icon" onClick={() => {setEditingItem({ ...editingItem, icon }); setEditingItemPopoverOpen(false);}}>
                                                                    {renderIcon(icon)}
                                                                </Button>
                                                            ))}
                                                        </PopoverContent>
                                                    </Popover>
                                                    <Input
                                                        value={editingItem.name}
                                                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                                        className="flex-1"
                                                        disabled={SYSTEM_CATEGORIES.includes(item.name)}
                                                    />
                                                    <Button variant="ghost" size="icon" type="button" onClick={handleSaveEdit} disabled={isSaving}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" type="button" onClick={() => setEditingItem(null)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center flex-1 gap-2">
                                                        {renderIcon(item.icon)}
                                                        <span>{item.name}</span>
                                                    </div>
                                                    <Button variant="ghost" size="icon" type="button" onClick={() => setEditingItem(item)} disabled={SYSTEM_CATEGORIES.includes(item.name)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                     <Button variant="ghost" size="icon" type="button" onClick={() => handleUpdateStatus(item.id, 'inactive')} disabled={SYSTEM_CATEGORIES.includes(item.name)}>
                                                        <Archive className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" type="button" disabled={SYSTEM_CATEGORIES.includes(item.name)}>
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
                                         {index === lastSelectedIndex && selectedIds.length > 1 && (
                                            <div className="pt-2 pl-8">
                                                <MergeItemsDialog
                                                    open={showMergeDialog}
                                                    onOpenChange={setShowMergeDialog}
                                                    items={categories?.filter(c => selectedIds.includes(c.id)) || []}
                                                    itemType="Category"
                                                    onMerge={handleMerge}
                                                    isSaving={isSaving}
                                                >
                                                    <Button variant="outline" size="sm">
                                                        <Merge className="mr-2 h-4 w-4" />
                                                        Merge {selectedIds.length} selected categories
                                                    </Button>
                                                </MergeItemsDialog>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center gap-2 pt-4">
                            <Popover open={newItemPopoverOpen} onOpenChange={setNewItemPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="icon" className="shrink-0">{renderIcon(newItem.icon)}</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto grid grid-cols-5 gap-2">
                                    {availableIcons.map(icon => (
                                        <Button key={icon} variant="ghost" size="icon" onClick={() => {setNewItem({...newItem, icon}); setNewItemPopoverOpen(false);}}>
                                            {renderIcon(icon)}
                                        </Button>
                                    ))}
                                </PopoverContent>
                            </Popover>
                            <Input
                                value={newItem.name}
                                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                                placeholder="Add new category"
                            />
                            <Button type="button" size="icon" onClick={handleAddItem} disabled={isSaving}>
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                            </Button>
                        </div>

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
                                                <span className="text-muted-foreground">{item.name}</span>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(item.id, 'active')}>
                                                <RotateCw className="mr-2 h-4 w-4" />
                                                Restore
                                            </Button>
                                        </div>
                                    ))}
                                </CollapsibleContent>
                            </Collapsible>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
