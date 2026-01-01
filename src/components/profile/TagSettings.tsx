
'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase, errorEmitter, FirestorePermissionError, setDocumentNonBlocking } from '@/firebase';
import { Tag } from '@/lib/types';
import { collection, doc, writeBatch, query, getDocs, where, arrayRemove } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2, Edit, Check, X, Pilcrow, Merge, Archive, Eye, EyeOff, RotateCw, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { availableIcons } from '@/lib/defaults';
import * as LucideIcons from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { MergeItemsDialog } from '@/components/profile/MergeItemsDialog';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export function TagSettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const queryHook = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/tags`) : null
    , [firestore, user]);

    const { data: items, isLoading } = useCollection<Tag>(queryHook);

    const [newItemName, setNewItemName] = useState('');
    const [newItemIcon, setNewItemIcon] = useState('Tag');
    const [editingItem, setEditingItem] = useState<{ id: string; name: string; icon: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
    const [editIconPopoverOpen, setEditIconPopoverOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showMergeDialog, setShowMergeDialog] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');


    const renderIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="h-5 w-5" /> : <Pilcrow className="h-5 w-5" />;
    };

    const handleAddItem = async () => {
        if (!newItemName || !user || !firestore) return;

        const isDuplicate = items?.some(t => t.name.toLowerCase() === newItemName.toLowerCase());
        if (isDuplicate) {
            toast({
                variant: 'destructive',
                title: 'Duplicate Tag',
                description: `A tag named "${newItemName}" already exists.`,
            });
            return;
        }

        setIsSaving(true);
        const ref = collection(firestore, `users/${user.uid}/tags`);
        const newDocRef = doc(ref);
        const tagData = { id: newDocRef.id, name: newItemName, icon: newItemIcon, userId: user.uid, status: 'active' };

        try {
            await setDocumentNonBlocking(newDocRef, tagData);
            toast({ title: 'Tag Added' });
            setNewItemName('');
            setNewItemIcon('Tag');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleUpdateItem = async () => {
        if (!editingItem || !user || !firestore) return;

        const isDuplicate = items?.some(t =>
            t.name.toLowerCase() === editingItem.name.toLowerCase() && t.id !== editingItem.id
        );

        if (isDuplicate) {
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

        try {
            await setDocumentNonBlocking(itemRef, updatedData, { merge: true });
            toast({ title: "Tag Updated" });
            setEditingItem(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!user || !firestore) return;
        setIsSaving(true);
        const itemRef = doc(firestore, `users/${user.uid}/tags`, itemId);
        const batch = writeBatch(firestore);

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

        setIsSaving(true);
        const itemRef = doc(firestore, `users/${user.uid}/tags`, itemId);
        setDocumentNonBlocking(itemRef, { status: status }, { merge: true })
            .then(() => {
                toast({ title: `Tag ${status === 'active' ? 'Restored' : 'Archived'}` });
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


    const { activeTags, inactiveTags } = useMemo(() => {
        const filtered = (items || []).filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return filtered.reduce((acc, tag) => {
            if (tag.status === 'inactive') {
                acc.inactiveTags.push(tag);
            } else {
                acc.activeTags.push(tag);
            }
            return acc;
        }, { activeTags: [] as Tag[], inactiveTags: [] as Tag[] });
    }, [items, searchQuery]);

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
        <div className="space-y-4">
            <Card>
                <CardHeader className="space-y-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search tags..."
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
                            placeholder="New Tag Name"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                            className="flex-grow"
                        />
                        <Button onClick={handleAddItem} disabled={isSaving || !newItemName} className="w-28 shrink-0">
                            {isSaving ? <Loader2 className="animate-spin" /> : 'Add'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <>
                            <div className="flex items-center px-2">
                                <Checkbox
                                    id="select-all-tags"
                                    checked={selectedIds.length === activeTags.length && activeTags.length > 0}
                                    onCheckedChange={(checked) => setSelectedIds(checked ? activeTags.map(c => c.id) : [])}
                                />
                                <label htmlFor="select-all-tags" className="text-sm font-medium ml-2">Select All</label>
                            </div>
                            {activeTags.map((item, index) => (
                                <div key={item.id}>
                                    <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                                        {editingItem?.id !== item.id && (
                                            <Checkbox
                                                id={`select-tag-${item.id}`}
                                                checked={selectedIds.includes(item.id)}
                                                onCheckedChange={(checked) => handleSelectionChange(item.id, checked)}
                                                disabled={isSaving}
                                            />
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
                                                    {renderIcon(item.icon)}
                                                    <span className="text-[15px]">{item.name}</span>
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
                             {activeTags.length === 0 && searchQuery && (
                                <p className="text-center text-sm text-muted-foreground py-4">No tags match your search.</p>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

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
