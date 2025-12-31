
'use client';

import { useCollection, useFirestore, useUser, useMemoFirebase, errorEmitter, FirestorePermissionError, setDocumentNonBlocking } from '@/firebase';
import { Category } from '@/lib/types';
import { collection, doc, writeBatch, query, getDocs, where } from 'firebase/firestore';
import { useState, useMemo } from 'react';
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

function AddOrEditItemDialog({
    isOpen,
    onOpenChange,
    itemToEdit,
    onSave,
    itemType
}: {
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    itemToEdit: { id: string, name: string, icon: string } | null,
    onSave: (name: string, icon: string) => void,
    itemType: 'Category' | 'Tag'
}) {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState(itemType === 'Category' ? 'Shapes' : 'Tag');
    const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            if (itemToEdit) {
                setName(itemToEdit.name);
                setIcon(itemToEdit.icon);
            } else {
                setName('');
                setIcon(itemType === 'Category' ? 'Shapes' : 'Tag');
            }
        }
    }, [isOpen, itemToEdit, itemType]);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(name, icon);
        setIsSaving(false);
        onOpenChange(false);
    };

    const renderIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="h-5 w-5" /> : <Pilcrow className="h-5 w-5" />;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitlePrimitive>{itemToEdit ? `Edit ${itemType}` : `Add New ${itemType}`}</DialogTitlePrimitive>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Input
                        placeholder={`${itemType} Name`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                    <Popover open={iconPopoverOpen} onOpenChange={setIconPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                                {renderIcon(icon)}
                                <span className="ml-2">{icon}</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto grid grid-cols-5 gap-2">
                            {availableIcons.map(iconName => (
                                <Button key={iconName} variant="ghost" size="icon" onClick={() => { setIcon(iconName); setIconPopoverOpen(false); }}>
                                    {renderIcon(iconName)}
                                </Button>
                            ))}
                        </PopoverContent>
                    </Popover>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !name}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function CategorySettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const categoriesQuery = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/categories`) : null
        , [firestore, user]);

    const { data: categories, isLoading } = useCollection<Category>(categoriesQuery);

    const [editingItem, setEditingItem] = useState<{ id: string; name: string; icon: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showMergeDialog, setShowMergeDialog] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);


    const SYSTEM_CATEGORIES = ['Credit Limit Upgrade', 'Credit Card Payment', 'Credit Limit Downgrade'];

    const renderIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="h-5 w-5" /> : <Pilcrow className="h-5 w-5" />;
    };
    
    const handleSaveItem = async (name: string, icon: string) => {
        if (!name || !user || !firestore) return;
        
        const isDuplicate = categories?.some(c =>
            c.name.toLowerCase() === name.toLowerCase() && c.id !== editingItem?.id
        );

        if (isDuplicate) {
            toast({
                variant: 'destructive',
                title: 'Duplicate Category',
                description: `A category named "${name}" already exists.`,
            });
            return;
        }
        
        setIsSaving(true);
        
        try {
            if (editingItem) {
                // Update existing item
                const itemRef = doc(firestore, `users/${user.uid}/categories`, editingItem.id);
                const updatedData = { name, icon };
                await setDocumentNonBlocking(itemRef, updatedData, { merge: true });
                toast({ title: "Category Updated" });
            } else {
                // Add new item
                const ref = collection(firestore, `users/${user.uid}/categories`);
                const newDocRef = doc(ref);
                const categoryData = { id: newDocRef.id, name, icon, userId: user.uid, status: 'active' };
                await setDocumentNonBlocking(newDocRef, categoryData);
                toast({ title: 'Category Added' });
            }
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.'});
        } finally {
            setIsSaving(false);
            setEditingItem(null);
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

        const itemRef = doc(firestore, `users/${user.uid}/categories`, itemId);
        setDocumentNonBlocking(itemRef, { status: status }, { merge: true }).then(() => {
            toast({ title: `Category ${status === 'active' ? 'Restored' : 'Archived'}` });
        }).catch((err) => {
             toast({ variant: 'destructive', title: 'Error', description: err.message });
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
            setSelectedIds(prev => prev.filter(i => i !== id));
        }
    };
    
    const lastSelectedIndex = activeCategories.reduce((lastIndex, item, currentIndex) => {
        return selectedIds.includes(item.id) ? currentIndex : lastIndex;
    }, -1);


    return (
        <div className="space-y-4">
            <AddOrEditItemDialog 
                isOpen={isAddDialogOpen || !!editingItem}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsAddDialogOpen(false);
                        setEditingItem(null);
                    }
                }}
                itemToEdit={editingItem}
                onSave={handleSaveItem}
                itemType="Category"
            />
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search categories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Button onClick={() => { setEditingItem(null); setIsAddDialogOpen(true); }}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add New
                        </Button>
                    </div>
                </CardHeader>
                 <CardContent className="space-y-2">
                     {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 px-2">
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
                                        <div className="flex items-center flex-1 gap-2">
                                            {renderIcon(item.icon)}
                                            <span>{item.name}</span>
                                            {SYSTEM_CATEGORIES.includes(item.name) && (
                                                <Badge variant="secondary">System</Badge>
                                            )}
                                        </div>
                                        <Button variant="ghost" size="icon" type="button" onClick={() => setEditingItem(item)}>
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
        </div>
    );
}
