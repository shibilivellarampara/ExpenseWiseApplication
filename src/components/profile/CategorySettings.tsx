
'use client';

import { useCollection, useFirestore, useUser, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Category, Expense } from '@/lib/types';
import { collection, doc, writeBatch, getDocs, query, where, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, PlusCircle, Trash2, Edit, Check, X, Pilcrow, ChevronDown, Merge } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { availableIcons } from '@/lib/defaults';
import * as LucideIcons from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import { MergeItemsDialog } from './MergeItemsDialog';

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
        const categoryData = { id: newDocRef.id, name: newItem.name, icon: newItem.icon, userId: user.uid };

        setDoc(newDocRef, categoryData)
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

        setDoc(itemRef, updatedData, { merge: true })
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

    
    const sortedCategories = categories ? [...categories].sort((a, b) => a.name.localeCompare(b.name)) : [];

    const handleSelectionChange = (id: string, checked: boolean | string) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id));
        }
    };
    

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
                                        checked={selectedIds.length === sortedCategories.length && sortedCategories.length > 0}
                                        onCheckedChange={(checked) => setSelectedIds(checked ? sortedCategories.map(c => c.id) : [])}
                                    />
                                    <label htmlFor="select-all-categories" className="text-sm font-medium">Select All</label>
                                </div>
                                {sortedCategories.map((item) => (
                                    <div key={item.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                                         <Checkbox
                                            id={`select-cat-${item.id}`}
                                            checked={selectedIds.includes(item.id)}
                                            onCheckedChange={(checked) => handleSelectionChange(item.id, checked)}
                                            disabled={isSaving}
                                        />
                                        {editingItem?.id === item.id ? (
                                            <div className="flex items-center gap-2 w-full">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" size="icon" className="shrink-0">{renderIcon(editingItem.icon)}</Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto grid grid-cols-5 gap-2">
                                                        {availableIcons.map(icon => (
                                                            <Button key={icon} variant="ghost" size="icon" onClick={() => setEditingItem({ ...editingItem, icon })}>
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
                                                <Button variant="ghost" size="icon" type="button" onClick={() => handleRemoveItem(item.id)} disabled={SYSTEM_CATEGORIES.includes(item.name)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                         {selectedIds.length > 1 && (
                            <div className="pt-2">
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
                        <div className="flex items-center gap-2 pt-4">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="icon" className="shrink-0">{renderIcon(newItem.icon)}</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto grid grid-cols-5 gap-2">
                                    {availableIcons.map(icon => (
                                        <Button key={icon} variant="ghost" size="icon" onClick={() => setNewItem({...newItem, icon})}>
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
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
