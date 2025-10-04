'use client';

import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { PaymentMethod } from '@/lib/types';
import { collection, doc, writeBatch, addDoc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, PlusCircle, Trash2, Edit, Check, X, Pilcrow } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { availableIcons } from '@/lib/defaults';
import * as LucideIcons from 'lucide-react';

export function PaymentMethodSettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const query = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/paymentMethods`) : null
    , [firestore, user]);

    const { data: items, isLoading } = useCollection<PaymentMethod>(query);

    const [newItem, setNewItem] = useState<{name: string, icon: string}>({ name: '', icon: 'CreditCard' });
    const [editingItem, setEditingItem] = useState<{ id: string; name: string; icon: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const renderIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="h-5 w-5 mr-3" /> : <Pilcrow className="h-5 w-5 mr-3" />;
    };

    const handleAddItem = async () => {
        if (!newItem.name || !user || !firestore) return;
        setIsSaving(true);
        try {
            const ref = collection(firestore, `users/${user.uid}/paymentMethods`);
            await addDoc(ref, { name: newItem.name, icon: newItem.icon, userId: user.uid });
            setNewItem({ name: '', icon: 'CreditCard' });
            toast({ title: 'Payment Method Added' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!user || !firestore) return;
        setIsSaving(true);
        try {
            const itemRef = doc(firestore, `users/${user.uid}/paymentMethods`, itemId);
            const batch = writeBatch(firestore);
            batch.delete(itemRef);
            await batch.commit();
            toast({ title: 'Payment Method Removed' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingItem || !user || !firestore) return;
        setIsSaving(true);
        try {
            const itemRef = doc(firestore, `users/${user.uid}/paymentMethods`, editingItem.id);
            await setDoc(itemRef, { name: editingItem.name, icon: editingItem.icon }, { merge: true });
            toast({ title: "Payment Method Updated" });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Update Failed", description: error.message });
        } finally {
            setEditingItem(null);
            setIsSaving(false);
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Payment Methods</CardTitle>
                <CardDescription>Manage your payment options.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex justify-center"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="space-y-2">
                        {items?.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                {editingItem?.id === item.id ? (
                                    <div className="flex-1 flex items-center gap-2">
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
                                            autoFocus
                                        />
                                    </div>
                                ) : (
                                     <div className="flex items-center">
                                      {renderIcon(item.icon)}
                                      <span>{item.name}</span>
                                    </div>
                                )}
                                <div className="flex items-center">
                                    {editingItem?.id === item.id ? (
                                        <>
                                            <Button variant="ghost" size="icon" type="button" onClick={handleSaveEdit} disabled={isSaving}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" type="button" onClick={() => setEditingItem(null)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button variant="ghost" size="icon" type="button" onClick={() => setEditingItem(item)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" type="button" onClick={() => handleRemoveItem(item.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
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
                        placeholder="Add new payment method"
                    />
                    <Button type="button" size="icon" onClick={handleAddItem} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
