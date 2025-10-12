'use client';

import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Category } from '@/lib/types';
import { collection, doc, writeBatch, addDoc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, PlusCircle, Trash2, Edit, Check, X, Pilcrow, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { availableIcons } from '@/lib/defaults';
import * as LucideIcons from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '@/lib/utils';

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

    const renderIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="h-5 w-5" /> : <Pilcrow className="h-5 w-5" />;
    };

    const handleAddItem = async () => {
        if (!newItem.name || !user || !firestore) return;
        setIsSaving(true);
        try {
            const ref = collection(firestore, `users/${user.uid}/categories`);
            const newDocRef = doc(ref);
            await setDoc(newDocRef, { id: newDocRef.id, name: newItem.name, icon: newItem.icon, userId: user.uid });
            setNewItem({ name: '', icon: 'Shapes' });
            toast({ title: 'Category Added' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!user || !firestore) return;

        const itemToRemove = categories?.find(i => i.id === itemId);
        if (itemToRemove?.name === 'Credit Limit Upgrade') {
            toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'The "Credit Limit Upgrade" category is a system category and cannot be removed.' });
            return;
        }

        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            const itemRef = doc(firestore, `users/${user.uid}/categories`, itemId);
            batch.delete(itemRef);
            await batch.commit();
            toast({ title: 'Category Removed' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingItem || !user || !firestore) return;

        const originalItem = categories?.find(i => i.id === editingItem.id);
        if (originalItem?.name === 'Credit Limit Upgrade') {
            toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'The "Credit Limit Upgrade" category is a system category and cannot be edited.' });
            setEditingItem(null);
            return;
        }

        setIsSaving(true);
        try {
            const itemRef = doc(firestore, `users/${user.uid}/categories`, editingItem.id);
            await setDoc(itemRef, { name: editingItem.name, icon: editingItem.icon }, { merge: true });
            toast({ title: "Category Updated" });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Update Failed", description: error.message });
        } finally {
            setEditingItem(null);
            setIsSaving(false);
        }
    };
    
    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                     <CardHeader className="flex flex-row items-center justify-between cursor-pointer p-4">
                        <div>
                            <h3 className="text-lg font-semibold font-headline">Categories</h3>
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
                                {categories?.map((item) => (
                                    <div key={item.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
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
