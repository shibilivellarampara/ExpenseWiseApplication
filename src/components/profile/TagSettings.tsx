
'use client';

import { useCollection, useFirestore, useUser, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Tag, Expense } from '@/lib/types';
import { collection, doc, setDoc, writeBatch, query, where, getDocs, arrayRemove, arrayUnion } from 'firebase/firestore';
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

export function TagSettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const queryHook = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/tags`) : null
    , [firestore, user]);

    const { data: items, isLoading } = useCollection<Tag>(queryHook);

    const [newItem, setNewItem] = useState<{name: string, icon: string}>({ name: '', icon: 'Tag' });
    const [editingItem, setEditingItem] = useState<{ id: string; name: string; icon: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showMergeDialog, setShowMergeDialog] = useState(false);


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
        const tagData = { id: newDocRef.id, name: newItem.name, icon: newItem.icon, userId: user.uid };

        setDoc(newDocRef, tagData)
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
        setDoc(itemRef, updatedData, { merge: true })
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


    const sortedItems = items ? [...items].sort((a, b) => a.name.localeCompare(b.name)) : [];
    
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
                            <h3 className="text-base font-semibold font-headline">Tags</h3>
                            <CardDescription className="text-sm">Manage your expense tags/labels.</CardDescription>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="space-y-4 pt-0 p-4">
                        {selectedIds.length > 1 && (
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
                                    Merge {selectedIds.length} Tags
                                </Button>
                            </MergeItemsDialog>
                        )}
                        {isLoading ? (
                            <div className="flex justify-center"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <div className="space-y-2">
                                {sortedItems.map((item) => (
                                    <div key={item.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                                        <Checkbox
                                            id={`select-tag-${item.id}`}
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
                                                    autoFocus
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
                                                <Button variant="ghost" size="icon" type="button" onClick={() => handleRemoveItem(item.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                ))}
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
                                placeholder="Add new tag"
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
