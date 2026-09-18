'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2, Edit, Check, X, Pilcrow, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { availableIcons } from '@/lib/defaults';
import * as LucideIcons from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from '@/components/ui/alert-dialog';
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, query, getDocs, where, arrayRemove, deleteField, deleteDoc } from 'firebase/firestore';
import { SharedCategory, SharedTag } from '@/lib/types';

type TaxonomyKind = 'categories' | 'tags';
type TaxonomyItem = SharedCategory | SharedTag;

const KIND_CONFIG: Record<TaxonomyKind, { label: string; defaultIcon: string }> = {
  categories: { label: 'Category', defaultIcon: 'Shapes' },
  tags: { label: 'Tag', defaultIcon: 'Tag' },
};

export function ManageSharedTaxonomyDialog({
  spaceId,
  kind,
  children,
}: {
  spaceId: string;
  kind: TaxonomyKind;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const config = KIND_CONFIG[kind];

  const itemsQuery = useMemoFirebase(() => (open ? collection(firestore, `sharedSpaces/${spaceId}/${kind}`) : null), [firestore, spaceId, kind, open]);
  const { data: items, isLoading } = useCollection<TaxonomyItem>(itemsQuery);

  const [newItemName, setNewItemName] = useState('');
  const [newItemIcon, setNewItemIcon] = useState(config.defaultIcon);
  const [editingItem, setEditingItem] = useState<{ id: string; name: string; icon: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
  const [editIconPopoverOpen, setEditIconPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <Pilcrow className="h-5 w-5" />;
  };

  const filteredItems = useMemo(() => {
    return (items || [])
      .filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, searchQuery]);

  const handleAddItem = async () => {
    if (!newItemName || !firestore) return;
    const isDuplicate = items?.some((i) => i.name.toLowerCase() === newItemName.toLowerCase());
    if (isDuplicate) {
      toast({ variant: 'destructive', title: `Duplicate ${config.label}`, description: `A ${config.label.toLowerCase()} named "${newItemName}" already exists.` });
      return;
    }
    setIsSaving(true);
    const newDocRef = doc(collection(firestore, `sharedSpaces/${spaceId}/${kind}`));
    try {
      await setDocumentNonBlocking(newDocRef, { id: newDocRef.id, name: newItemName, icon: newItemIcon, spaceId });
      toast({ title: `${config.label} Added` });
      setNewItemName('');
      setNewItemIcon(config.defaultIcon);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !firestore) return;
    const isDuplicate = items?.some((i) => i.name.toLowerCase() === editingItem.name.toLowerCase() && i.id !== editingItem.id);
    if (isDuplicate) {
      toast({ variant: 'destructive', title: `Duplicate ${config.label}`, description: `A ${config.label.toLowerCase()} named "${editingItem.name}" already exists.` });
      return;
    }
    setIsSaving(true);
    const itemRef = doc(firestore, `sharedSpaces/${spaceId}/${kind}`, editingItem.id);
    try {
      await setDocumentNonBlocking(itemRef, { name: editingItem.name, icon: editingItem.icon }, { merge: true });
      toast({ title: `${config.label} Updated` });
      setEditingItem(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!firestore) return;
    setIsSaving(true);
    const itemRef = doc(firestore, `sharedSpaces/${spaceId}/${kind}`, itemId);
    try {
      const expensesRef = collection(firestore, `sharedSpaces/${spaceId}/expenses`);
      const q =
        kind === 'categories'
          ? query(expensesRef, where('categoryId', '==', itemId))
          : query(expensesRef, where('tagIds', 'array-contains', itemId));
      const snapshot = await getDocs(q);
      const refs = snapshot.docs.map((d) => d.ref);

      for (let i = 0; i < refs.length; i += 449) {
        const batch = writeBatch(firestore);
        refs.slice(i, i + 449).forEach((ref) => {
          if (kind === 'categories') {
            batch.update(ref, { categoryId: deleteField() });
          } else {
            batch.update(ref, { tagIds: arrayRemove(itemId) });
          }
        });
        await batch.commit();
      }

      await deleteDoc(itemRef);
      toast({ title: `${config.label} Removed` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage {config.label}s</DialogTitle>
          <DialogDescription>Shared with everyone in this space.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${config.label.toLowerCase()}s...`}
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
                    {availableIcons.map((iconName) => (
                      <Button key={iconName} variant="ghost" size="icon" onClick={() => { setNewItemIcon(iconName); setIconPopoverOpen(false); }}>
                        {renderIcon(iconName)}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
            <Input
              placeholder={`New ${config.label} Name`}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              className="flex-grow h-10"
            />
            <Button onClick={handleAddItem} disabled={isSaving || !newItemName} className="w-[88px] h-10 px-4">
              {isSaving ? <Loader2 className="animate-spin" /> : 'Add'}
            </Button>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
              <>
                {filteredItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
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
                                {availableIcons.map((iconName) => (
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
                        <button onClick={() => setEditingItem(item)}>{renderIcon(item.icon)}</button>
                        <div className="flex items-center flex-1 gap-2">
                          <span className="text-[15px]">{item.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" type="button" onClick={() => setEditingItem(item)}>
                          <Edit className="h-4 w-4" />
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
                                This will permanently delete the "{item.name}" {config.label.toLowerCase()} for everyone in this space.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveItem(item.id)} className="bg-destructive hover:bg-destructive/90">
                                {isSaving ? <Loader2 className="animate-spin" /> : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                ))}
                {filteredItems.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    {searchQuery ? `No ${config.label.toLowerCase()}s match your search.` : `No ${config.label.toLowerCase()}s yet.`}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
