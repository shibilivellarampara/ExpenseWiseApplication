'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { AutoTag } from '@/lib/types';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Sparkles, Tag as TagIcon, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { normalizeTag } from '@/lib/utils';
import { serverTimestamp } from 'firebase/firestore';

interface AutoTagSettingsProps {
    walletId: string;
}

export function AutoTagSettings({ walletId }: AutoTagSettingsProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [newTagName, setNewTagName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const autoTagsQuery = useMemoFirebase(() => 
        query(collection(firestore, `familyWallets/${walletId}/autoTags`), orderBy('createdAt', 'desc'))
    , [firestore, walletId]);

    const { data: autoTags, isLoading } = useCollection<AutoTag>(autoTagsQuery);

    const handleAddTag = async () => {
        if (!newTagName.trim() || !user) return;
        
        const normalized = normalizeTag(newTagName);
        
        // Check for duplicates
        if (autoTags?.some(t => t.normalizedName === normalized)) {
            toast({
                variant: 'destructive',
                title: 'Duplicate Tag',
                description: `The tag "${normalized}" is already set as a trigger for this wallet.`
            });
            return;
        }

        setIsSaving(true);
        try {
            const colRef = collection(firestore, `familyWallets/${walletId}/autoTags`);
            await addDocumentNonBlocking(colRef, {
                tagName: newTagName.trim(),
                normalizedName: normalized,
                createdBy: user.uid,
                createdAt: serverTimestamp(),
            });
            
            setNewTagName('');
            toast({ title: 'Auto-Tag Added', description: `Future personal transactions with "${normalized}" will sync here.` });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed to add tag' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTag = async (tagId: string) => {
        try {
            const tagRef = doc(firestore, `familyWallets/${walletId}/autoTags`, tagId);
            await deleteDocumentNonBlocking(tagRef);
            toast({ title: 'Trigger Removed' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Delete Failed' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70">Add Sync Trigger</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Define tags that exist in your personal records. When you add a personal transaction with one of these tags, it will automatically be mirrored in this family wallet.
                </p>
                <div className="flex gap-2 mt-3">
                    <div className="relative flex-1">
                        <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <Input 
                            placeholder="e.g. family-expense" 
                            className="pl-9 h-11 rounded-xl bg-muted/30 border-none"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        />
                    </div>
                    <Button onClick={handleAddTag} disabled={isSaving || !newTagName.trim()} className="h-11 rounded-xl px-6">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70">Active Triggers</h4>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary/30" />
                    </div>
                ) : autoTags && autoTags.length > 0 ? (
                    <div className="grid gap-2">
                        {autoTags.map((tag) => (
                            <div key={tag.id} className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 border border-primary/10 group animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-foreground">{tag.tagName}</span>
                                        <span className="text-[10px] uppercase font-bold text-primary/60 tracking-wider">Normalized: {tag.normalizedName}</span>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteTag(tag.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-[24px] bg-muted/10 opacity-50">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <p className="text-xs font-medium">No auto-tags defined yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
