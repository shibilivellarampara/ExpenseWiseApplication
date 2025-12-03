
'use client';

import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Account, Category } from '@/lib/types';
import { collection, doc, writeBatch, getDocs, query, where, setDoc, increment } from 'firebase/firestore';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, Merge } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { MergeItemsDialog } from '@/components/profile/MergeItemsDialog';

export function AccountSettings() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const accountsQuery = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/accounts`) : null
    , [firestore, user]);

    const { data: accounts, isLoading } = useCollection<Account>(accountsQuery);

    const [isSaving, setIsSaving] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showMergeDialog, setShowMergeDialog] = useState(false);
    
    const handleMerge = async (target: { id: string } | { name: string; icon: string; type?: Account['type'] }) => {
        if (!user || !firestore || !accounts || selectedIds.length < 2) return;
        setIsSaving(true);
    
        try {
            const batch = writeBatch(firestore);
            let targetAccount: Account;
    
            // Step 1: Determine target account (create new if necessary)
            if ('name' in target) {
                const newAccRef = doc(collection(firestore, `users/${user.uid}/accounts`));
                targetAccount = {
                    id: newAccRef.id,
                    userId: user.uid,
                    name: target.name,
                    icon: target.icon,
                    type: target.type || 'bank', // Provide a default
                    balance: 0, // Will be recalculated
                    status: 'active',
                };
                batch.set(newAccRef, targetAccount);
            } else {
                const existingTarget = accounts.find(acc => acc.id === target.id);
                if (!existingTarget) throw new Error("Target account not found");
                targetAccount = existingTarget;
            }
    
            const sourceAccounts = accounts.filter(acc => selectedIds.includes(acc.id) && acc.id !== targetAccount.id);
            const sourceIds = sourceAccounts.map(acc => acc.id);
    
            // Step 2: Find all transactions using source accounts
            const expensesRef = collection(firestore, `users/${user.uid}/expenses`);
            const q = query(expensesRef, where('accountId', 'in', sourceIds));
            const expensesToUpdateSnapshot = await getDocs(q);
    
            // Step 3: Update transactions
            expensesToUpdateSnapshot.forEach(doc => {
                batch.update(doc.ref, { accountId: targetAccount.id });
            });
    
            // Step 4: Recalculate target account balance
            let finalBalance = targetAccount.balance;
            let finalLimit = targetAccount.limit || 0;
            
            sourceAccounts.forEach(acc => {
                finalBalance += acc.balance;
                if(acc.type === 'credit_card' && acc.limit) {
                    finalLimit += acc.limit;
                }
            });

            const targetAccRef = doc(firestore, `users/${user.uid}/accounts`, targetAccount.id);
            const updatePayload: any = { balance: finalBalance };
            if(targetAccount.type === 'credit_card') {
                updatePayload.limit = finalLimit;
            }
            batch.update(targetAccRef, updatePayload);

            // Step 5: Delete source accounts
            sourceIds.forEach(id => {
                const accRef = doc(firestore, `users/${user.uid}/accounts`, id);
                batch.delete(accRef);
            });
    
            await batch.commit();
            toast({ title: "Merge Complete", description: `${selectedIds.length} accounts merged successfully into "${targetAccount.name}".` });
            setSelectedIds([]);
            setShowMergeDialog(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Merge Failed", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };


    const sortedAccounts = accounts ? [...accounts].sort((a, b) => a.name.localeCompare(b.name)) : [];

    const handleSelectionChange = (id: string, checked: boolean | string) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id));
        }
    };
    
    const lastSelectedIndex = sortedAccounts.reduce((lastIndex, item, currentIndex) => {
        return selectedIds.includes(item.id) ? currentIndex : lastIndex;
    }, -1);


    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                     <CardHeader className="flex flex-row items-center justify-between cursor-pointer p-4">
                        <div>
                            <h3 className="text-base font-semibold font-headline">Account Settings</h3>
                            <CardDescription className="text-sm">Manage and merge your accounts.</CardDescription>
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
                                <p className="text-sm text-muted-foreground">Select accounts to merge.</p>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="select-all-accounts"
                                        checked={selectedIds.length === sortedAccounts.length && sortedAccounts.length > 0}
                                        onCheckedChange={(checked) => setSelectedIds(checked ? sortedAccounts.map(c => c.id) : [])}
                                    />
                                    <label htmlFor="select-all-accounts" className="text-sm font-medium">Select All</label>
                                </div>
                                {sortedAccounts.map((item, index) => (
                                    <div key={item.id}>
                                        <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                                            <Checkbox
                                                id={`select-acc-settings-${item.id}`}
                                                checked={selectedIds.includes(item.id)}
                                                onCheckedChange={(checked) => handleSelectionChange(item.id, checked)}
                                                disabled={isSaving}
                                            />
                                            <label htmlFor={`select-acc-settings-${item.id}`} className="flex-1">{item.name}</label>
                                        </div>
                                         {index === lastSelectedIndex && selectedIds.length > 1 && (
                                            <div className="pt-2 pl-8">
                                                <MergeItemsDialog
                                                    open={showMergeDialog}
                                                    onOpenChange={setShowMergeDialog}
                                                    items={accounts?.filter(c => selectedIds.includes(c.id)) || []}
                                                    itemType="Account"
                                                    onMerge={handleMerge}
                                                    isSaving={isSaving}
                                                >
                                                    <Button variant="outline" size="sm">
                                                        <Merge className="mr-2 h-4 w-4" />
                                                        Merge {selectedIds.length} selected accounts
                                                    </Button>
                                                </MergeItemsDialog>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
