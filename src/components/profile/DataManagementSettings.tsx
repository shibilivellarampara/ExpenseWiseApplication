

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCollection, useFirestore, useUser, useAuth, useMemoFirebase, errorEmitter, FirestorePermissionError, commitBatchNonBlocking } from "@/firebase";
import { Account, UserProfile } from "@/lib/types";
import { collection, doc, writeBatch, getDocs, query, where } from "firebase/firestore";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import * as LucideIcons from 'lucide-react';
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Checkbox } from "../ui/checkbox";

type DeletableCollection = 'expenses' | 'accounts' | 'categories' | 'tags' | 'contributions' | 'debts';

const collectionLabels: Record<DeletableCollection, string> = {
    expenses: 'Transactions',
    accounts: 'Accounts',
    categories: 'Categories',
    tags: 'Tags',
    contributions: 'Shared Contributions',
    debts: 'Debts & Dues'
};


export function DataManagementSettings() {
    const { user } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isClearing, setIsClearing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [showReauthDialog, setShowReauthDialog] = useState(false);
    const [password, setPassword] = useState('');
    const [showSelectiveResetDialog, setShowSelectiveResetDialog] = useState(false);
    const [collectionsToReset, setCollectionsToReset] = useState<DeletableCollection[]>([]);


    const accountsQuery = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/accounts`) : null
    , [firestore, user]);
    const { data: accounts } = useCollection<Account>(accountsQuery);

    const renderIcon = (iconName: string | undefined, className?: string) => {
        if (!iconName) return <LucideIcons.Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className={cn("h-4 w-4", className)} /> : <LucideIcons.Pilcrow className={cn("h-4 w-4", className)} />;
    };

    const handleSelectiveReset = async () => {
        if (!user || !firestore || collectionsToReset.length === 0) return;
        setIsClearing(true);
        setProgress(0);
        try {
            const batch = writeBatch(firestore);
            
            const snapshots = await Promise.all(collectionsToReset.map(c => getDocs(collection(firestore, `users/${user.uid}/${c}`))));
            
            snapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
            });

            const progressInterval = setInterval(() => {
                setProgress(p => Math.min(p + 10, 90));
            }, 200);

            await commitBatchNonBlocking(batch, `users/${user.uid}`);
            
            clearInterval(progressInterval);
            setProgress(100);

            toast({ title: 'Data Cleared', description: 'Selected data has been deleted.' });
            setShowSelectiveResetDialog(false);
            setCollectionsToReset([]);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsClearing(false);
            setProgress(0);
        }
    };
    
    const handleClearAccountData = async () => {
        if (!user || !firestore || !selectedAccount) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select an account to clear.' });
            return;
        }

        setIsClearing(true);
        setProgress(0);
        
        try {
            const batch = writeBatch(firestore);
            let q;
            let actionText = '';

            if (selectedAccount === 'all') {
                q = query(collection(firestore, `users/${user.uid}/expenses`));
                actionText = 'All transactions have been deleted from all accounts.';
            } else {
                const accountToClear = accounts?.find(a => a.id === selectedAccount);
                if (!accountToClear) throw new Error('Selected account not found.');
                q = query(collection(firestore, `users/${user.uid}/expenses`), where('accountId', '==', selectedAccount));
                
                const accountRef = doc(firestore, `users/${user.uid}/accounts`, selectedAccount);
                batch.delete(accountRef);
                actionText = `All transactions for ${accountToClear.name} have been deleted, and the account has been removed.`;
            }

            const expensesSnapshot = await getDocs(q);
            expensesSnapshot.forEach(expenseDoc => {
                batch.delete(expenseDoc.ref);
            });
            
            await commitBatchNonBlocking(batch, `users/${user.uid}`);
            
            toast({ title: 'Data Cleared', description: actionText });
            setSelectedAccount(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsClearing(false);
            setProgress(0);
        }
    }
    
    const handleAccountDeletion = async () => {
        if (!user || !auth?.currentUser || !firestore) return;
        setIsDeleting(true);
        setProgress(0);

        const collectionsToDelete = ['expenses', 'accounts', 'categories', 'tags', 'contributions', 'debts'];
        
        try {
            let docsProcessed = 0;
            let totalDocs = 0;

            const snapshots = await Promise.all(collectionsToDelete.map(c => getDocs(collection(firestore, `users/${user.uid}/${c}`))));
            totalDocs = snapshots.reduce((sum, s) => sum + s.size, 0);

            const batch = writeBatch(firestore);
            
            for (const snapshot of snapshots) {
                snapshot.forEach(d => {
                    batch.delete(d.ref);
                    docsProcessed++;
                    setProgress((docsProcessed / (totalDocs + 1)) * 100);
                });
            }
            
            const userProfileRef = doc(firestore, `users/${user.uid}`);
            batch.delete(userProfileRef);

            await commitBatchNonBlocking(batch, `/users/${user.uid}`);
            setProgress(100);
            
            await deleteUser(auth.currentUser);
            
            toast({ title: "Account Closed", description: "Your account and all data have been permanently deleted." });
        } catch (error: any) {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `/users/${user.uid}`,
                operation: 'delete',
            }));
        } finally {
            setIsDeleting(false);
        }
    };


    const handleReauthenticate = async () => {
        if (!auth?.currentUser || !password) return;
        setIsDeleting(true);

        try {
            if (!auth.currentUser.email) {
                toast({ variant: "destructive", title: "Authentication Error", description: "Current user's email is not available." });
                setIsDeleting(false);
                return;
            }
            const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
            await reauthenticateWithCredential(auth.currentUser, credential);
            
            setShowReauthDialog(false);
            
            setTimeout(() => {
                const trigger = document.getElementById('final-delete-trigger');
                trigger?.click();
            }, 100);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Authentication Failed', description: error.message });
        } finally {
            setIsDeleting(false);
            setPassword('');
        }
    };

    return (
        <Card className="border-destructive/50">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="flex flex-row items-center justify-between cursor-pointer p-4">
                        <div className="flex items-center gap-3">
                             <AlertTriangle className="text-destructive h-5 w-5"/>
                            <div>
                                <h3 className="text-base font-semibold font-headline text-destructive">Danger Zone</h3>
                                <CardDescription className="text-sm">These actions are irreversible. Please be certain.</CardDescription>
                            </div>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="p-4 pt-0 space-y-4">
                        <div className="rounded-lg border border-destructive/50 p-4">
                            <h4 className="font-semibold">Reset Data</h4>
                            <p className="text-sm text-muted-foreground mt-1 mb-3">Permanently delete specific types of data from your account.</p>
                            
                            <Dialog open={showSelectiveResetDialog} onOpenChange={setShowSelectiveResetDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="destructive" size="sm">Reset Data</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Select Data to Reset</DialogTitle>
                                        <DialogDescription>
                                            Choose which items to permanently delete. This action cannot be undone.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-2 py-4">
                                        {Object.entries(collectionLabels).map(([key, label]) => (
                                            <div key={key} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`reset-${key}`}
                                                    checked={collectionsToReset.includes(key as DeletableCollection)}
                                                    onCheckedChange={(checked) => {
                                                        const collectionKey = key as DeletableCollection;
                                                        setCollectionsToReset(prev => 
                                                            checked ? [...prev, collectionKey] : prev.filter(c => c !== collectionKey)
                                                        );
                                                    }}
                                                />
                                                <Label htmlFor={`reset-${key}`} className="font-normal">{label}</Label>
                                            </div>
                                        ))}
                                    </div>
                                    {isClearing && (
                                        <div className="space-y-2 mt-2">
                                            <Progress value={progress} className="[&>div]:bg-destructive" />
                                            <p className="text-xs text-muted-foreground text-center">Deleting...</p>
                                        </div>
                                    )}
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setShowSelectiveResetDialog(false)}>Cancel</Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" disabled={collectionsToReset.length === 0 || isClearing}>
                                                    {isClearing ? <Loader2 className="animate-spin" /> : "Confirm & Delete"}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete all selected data. This action is irreversible.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleSelectiveReset} className="bg-destructive hover:bg-destructive/90">
                                                        {isClearing ? <Loader2 className="animate-spin" /> : "Yes, delete selected data"}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="rounded-lg border border-destructive/50 p-4">
                            <h4 className="font-semibold">Clear Account Data</h4>
                            <p className="text-sm text-muted-foreground mt-1 mb-3">Select an account to clear its transactions. Or, select 'All Accounts' to clear all transactions while keeping your accounts.</p>
                             {isClearing && selectedAccount && (
                                <div className="space-y-2 my-2">
                                    <Progress value={progress} className="[&>div]:bg-destructive" />
                                    <p className="text-xs text-muted-foreground text-center">Processing...</p>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Select onValueChange={setSelectedAccount} value={selectedAccount || ''}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an account..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            <div className="font-semibold">All Accounts (Transactions Only)</div>
                                        </SelectItem>
                                        {accounts?.map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>
                                                <div className="flex items-center">
                                                    {renderIcon(acc.icon)}
                                                    {acc.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm" disabled={!selectedAccount || isClearing}>Clear Data</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {selectedAccount === 'all'
                                                    ? 'This will permanently delete ALL transactions from every account. Your accounts, categories, and tags will remain. This action cannot be undone.'
                                                    : `This will permanently delete the account "${accounts?.find(a => a.id === selectedAccount)?.name}" and all transactions associated with it. This action cannot be undone.`
                                                }
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleClearAccountData} className="bg-destructive hover:bg-destructive/90">
                                                {isClearing ? <Loader2 className="animate-spin" /> : "Yes, clear data"}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>

                        <div className="rounded-lg border border-destructive/50 p-4">
                            <h4 className="font-semibold">Close Account</h4>
                            <p className="text-sm text-muted-foreground mt-1 mb-3">This will permanently delete your account and all associated data. This action is irreversible.</p>
                             {isDeleting && (
                                <div className="space-y-2 mt-2">
                                    <Progress value={progress} className="[&>div]:bg-destructive" />
                                    <p className="text-xs text-muted-foreground text-center">Deleting your data...</p>
                                </div>
                            )}
                            <Dialog open={showReauthDialog} onOpenChange={setShowReauthDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="destructive" size="sm" disabled={isDeleting}>Close My Account</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Please Re-authenticate</DialogTitle>
                                        <DialogDescription>For your security, please enter your password to continue.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-2 py-4">
                                        <Label htmlFor="password">Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setShowReauthDialog(false)}>Cancel</Button>
                                        <Button onClick={handleReauthenticate} variant="destructive" disabled={isDeleting || !password}>
                                            {isDeleting ? <Loader2 className="animate-spin" /> : "Confirm & Continue"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button id="final-delete-trigger" className="hidden">Final Delete Trigger</button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This is your final confirmation. This action will permanently delete your entire account, including all personal data, transactions, and settings. This cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleAccountDeletion} className="bg-destructive hover:bg-destructive/90">
                                            {isDeleting ? <Loader2 className="animate-spin" /> : "Yes, delete my account forever"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                        </div>

                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}

