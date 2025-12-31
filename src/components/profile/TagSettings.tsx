

'use client';

import { useCollection, useFirestore, useUser, useMemoFirebase, errorEmitter, FirestorePermissionError, setDocumentNonBlocking } from '@/firebase';
import { Tag, Expense } from '@/lib/types';
import { collection, doc, writeBatch, query, where, getDocs, arrayRemove, arrayUnion } from 'firebase/firestore';
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
import { MergeItemsDialog } from '@/components/profile/MergeItemsDialog';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export function TagSettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const queryHook = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/tags`) : null
    , [firestore, user]);

    const { data: items, isLoading } = useCollection<Tag>(queryHook);

    const [newItem, setNewItem] = useState<{name: string, icon: string}>({ name: '', icon: 'Tag' });
    const [editingItem, setEditingItem] = useState<{ id: string; name: string; icon: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showMergeDialog, setShowMergeDialog] = useState(false);
    const [newItemPopoverOpen, setNewItemPopoverOpen] = useState(false);
    const [editingItemPopoverOpen, setEditingItemPopoverOpen] = useState(false);
    const [showArchived, setShowArchived] = useState(false);


    const renderIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="h-5 w-5" /> : <Pilcrow className="h-5 w-5" />;
    };

    const handleAddItem = async () => {
        if (!newItem.name || !user || !firestore) return;
        
        if (items?.some(t => t.name.toLowerCase() === newItem.name.toLowerCase())) {
            toast({
                variant: 'destructive',
                title: 'Duplicate Tag',
                description: `A tag named "${newItem.name}" already exists.`,
            });
            return;
        }
        
        setIsSaving(true);
        const ref = collection(firestore, `users/${user.uid}/tags`);
        const newDocRef = doc(ref);
        const tagData = { id: newDocRef.id, name: newItem.name, icon: newItem.icon, userId: user.uid, status: 'active' };

        setDocumentNonBlocking(newDocRef, tagData)
            .then(() => {
                setNewItem({ name: '', icon: 'Tag' });
                toast({ title: 'Tag Added' });
            })
            .catch(async (serverError) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: newDocRef.path,
                    operation: 'create',
                    requestResourceData: tagData,
                }));
            })
            .finally(() => {
                setIsSaving(false);
            });
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!user || !firestore) return;
        setIsSaving(true);
        const itemRef = doc(firestore, `users/${user.uid}/tags`, itemId);
        const batch = writeBatch(firestore);

        // Find expenses with this tag and remove it from their tagIds array
        const expensesQuery = query(collection(firestore, `users/${user.uid}/expenses`), where('tagIds', 'array-contains', itemId));
        const expensesSnapshot = await getDocs(expensesQuery);
        expensesSnapshot.forEach(doc => {
            batch.update(doc.ref, {
                tagIds: arrayRemove(itemId)
            });
        });

        batch.delete(itemRef);
        batch.commit()
            .catch(async (serverError) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: itemRef.path,
                    operation: 'delete',
                }));
            })
            .finally(() => {
                toast({ title: 'Tag Removed' });
                setIsSaving(false);
            });
    };
    
    const handleUpdateStatus = (itemId: string, status: 'active' | 'inactive') => {
        if (!user || !firestore) return;

        const itemRef = doc(firestore, `users/${user.uid}/tags`, itemId);
        setDocumentNonBlocking(itemRef, { status: status }, { merge: true }).then(() => {
            toast({ title: `Tag ${status === 'active' ? 'Restored' : 'Archived'}` });
        }).catch((err) => {
             toast({ variant: 'destructive', title: 'Error', description: err.message });
        });
    }

    const handleSaveEdit = async () => {
        if (!editingItem || !user || !firestore) return;
        
        if (items?.some(t => t.id !== editingItem.id && t.name.toLowerCase() === editingItem.name.toLowerCase())) {
            toast({
                variant: 'destructive',
                title: 'Duplicate Tag',
                description: `A tag named "${editingItem.name}" already exists.`,
            });
            return;
        }

        setIsSaving(true);
        const itemRef = doc(firestore, `users/${user.uid}/tags`, editingItem.id);
        const updatedData = { name: editingItem.name, icon: editingItem.icon };
        setDocumentNonBlocking(itemRef, updatedData, { merge: true })
            .catch(async (serverError) => {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: itemRef.path,
                    operation: 'update',
                    requestResourceData: updatedData,
                }));
            })
            .finally(() => {
                toast({ title: "Tag Updated" });
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

            if ('name' in target) {
                const newTagRef = doc(collection(firestore, `users/${user.uid}/tags`));
                targetId = newTagRef.id;
                batch.set(newTagRef, { ...target, id: targetId, userId: user.uid });
            } else {
                targetId = target.id;
            }

            const sourceIds = selectedIds.filter(id => id !== targetId);

            const expensesRef = collection(firestore, `users/${user.uid}/expenses`);
            const q = query(expensesRef, where('tagIds', 'array-contains-any', sourceIds));
            const expensesToUpdateSnapshot = await getDocs(q);

            expensesToUpdateSnapshot.forEach(doc => {
                const expenseRef = doc.ref;
                const currentTagIds = doc.data().tagIds || [];
                // Remove all source tags and add target tag if not present
                const newTagIds = [...new Set([...currentTagIds.filter((id: string) => !sourceIds.includes(id)), targetId])];
                batch.update(expenseRef, { tagIds: newTagIds });
            });

            sourceIds.forEach(id => {
                const tagRef = doc(firestore, `users/${user.uid}/tags`, id);
                batch.delete(tagRef);
            });

            await batch.commit();
            toast({ title: "Merge Complete", description: `${selectedIds.length} tags merged successfully.` });
            setSelectedIds([]);
            setShowMergeDialog(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Merge Failed", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };


    const { activeTags, inactiveTags } = (items || []).reduce((acc, tag) => {
        if (tag.status === 'inactive') {
            acc.inactiveTags.push(tag);
        } else {
            acc.activeTags.push(tag);
        }
        return acc;
    }, { activeTags: [] as Tag[], inactiveTags: [] as Tag[] });

    activeTags.sort((a,b) => a.name.localeCompare(b.name));
    inactiveTags.sort((a,b) => a.name.localeCompare(b.name));

    
     const handleSelectionChange = (id: string, checked: boolean | string) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id));
        }
    };
    
    const lastSelectedIndex = activeTags.reduce((lastIndex, item, currentIndex) => {
        return selectedIds.includes(item.id) ? currentIndex : lastIndex;
    }, -1);


    return (
        <Card>
            <CardHeader>
                <h3 className="text-base font-semibold font-headline">Tags</h3>
                <CardDescription className="text-sm">Manage your expense tags/labels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
                {isLoading ? (
                    <div className="flex justify-center"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="select-all-tags"
                                checked={selectedIds.length === activeTags.length && activeTags.length > 0}
                                onCheckedChange={(checked) => setSelectedIds(checked ? activeTags.map(c => c.id) : [])}
                            />
                            <label htmlFor="select-all-tags" className="text-sm font-medium">Select All</label>
                        </div>
                        {activeTags.map((item, index) => (
                            <div key={item.id}>
                                <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                                    <Checkbox
                                        id={`select-tag-${item.id}`}
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
                                            <Button variant="ghost" size="icon" type="button" onClick={() => setEditingItem(item)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" type="button" onClick={() => handleUpdateStatus(item.id, 'inactive')}>
                                                <Archive className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" type="button">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete the "{item.name}" tag and remove it from all associated transactions.
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
                                            items={items?.filter(c => selectedIds.includes(c.id)) || []}
                                            itemType="Tag"
                                            onMerge={handleMerge}
                                            isSaving={isSaving}
                                        >
                                            <Button variant="outline" size="sm">
                                                <Merge className="mr-2 h-4 w-4" />
                                                Merge {selectedIds.length} selected tags
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
                        placeholder="Add new tag"
                    />
                    <Button type="button" size="icon" onClick={handleAddItem} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                    </Button>
                </div>
                
                {inactiveTags.length > 0 && (
                    <Collapsible open={showArchived} onOpenChange={setShowArchived}>
                        <Separator className="my-4"/>
                        <CollapsibleTrigger asChild>
                            <button className="flex w-full items-center justify-between p-2 text-sm font-medium text-muted-foreground">
                                <span>View {inactiveTags.length} archived tags</span>
                                {showArchived ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 p-2 pt-0">
                            {inactiveTags.map(item => (
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
        </Card>
    );
}
