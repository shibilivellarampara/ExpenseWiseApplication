

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
import { Account } from "@/lib/types";
import { collection, doc, writeBatch, getDocs, query, where, deleteDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

type DeletableCollection = 'expenses' | 'accounts' | 'categories' | 'tags' | 'debts' | 'assets' | 'recurringExpenses';

const collectionLabels: Record<DeletableCollection, string> = {
    expenses: 'Transactions',
    accounts: 'Accounts',
    categories: 'Categories',
    tags: 'Tags',
    debts: 'Debts & Dues',
    assets: 'Assets',
    recurringExpenses: 'Recurring Transactions'
};


export function DataManagementSettings() {
    const { user } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();

    // Reset States
    const [isResetting, setIsResetting] = useState(false);
    const [resetProgress, setResetProgress] = useState(0);
    const [collectionsToReset, setCollectionsToReset] = useState<DeletableCollection[]>([]);

    // Clear Account States
    const [selectedAccountToClear, setSelectedAccountToClear] = useState<string | null>(null);
    const [isCheckingTransactions, setIsCheckingTransactions] = useState(false);
    const [transactionCount, setTransactionCount] = useState<number | null>(null);
    const [isClearingAccount, setIsClearingAccount] = useState(false);
    const [clearConfirmationChecked, setClearConfirmationChecked] = useState(false);

    // Close Account States
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [showReauthDialog, setShowReauthDialog] = useState(false);
    const [password, setPassword] = useState('');
    const [closeConfirmationText, setCloseConfirmationText] = useState('');

    const accountsQuery = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/accounts`) : null
    , [firestore, user]);
    const { data: accounts } = useCollection<Account>(accountsQuery);

    useEffect(() => {
        if (!selectedAccountToClear) {
            setTransactionCount(null);
            return;
        }

        const fetchTransactionCount = async () => {
            if (!user || !firestore) return;
            setIsCheckingTransactions(true);
            try {
                let q;
                if (selectedAccountToClear === 'all') {
                    q = query(collection(firestore, `users/${user.uid}/expenses`));
                } else {
                    q = query(collection(firestore, `users/${user.uid}/expenses`), where('accountId', '==', selectedAccountToClear));
                }
                const snapshot = await getDocs(q);
                setTransactionCount(snapshot.size);
            } catch (e) {
                setTransactionCount(null);
            } finally {
                setIsCheckingTransactions(false);
            }
        };

        fetchTransactionCount();
    }, [selectedAccountToClear, user, firestore]);
    

    const handleSelectiveReset = async () => {
        if (!user || !firestore || collectionsToReset.length === 0) return;
        setIsResetting(true);
        setResetProgress(0);
        try {
            const batch = writeBatch(firestore);
            const snapshots = await Promise.all(collectionsToReset.map(c => getDocs(collection(firestore, `users/${user.uid}/${c}`))));
            snapshots.forEach(snapshot => snapshot.docs.forEach(doc => batch.delete(doc.ref)));

            await commitBatchNonBlocking(batch, `users/${user.uid}`);
            setResetProgress(100);

            toast({ title: 'Data Cleared', description: 'Selected data has been deleted.' });
            setCollectionsToReset([]);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Clearing Data', description: "Could not delete selected data. Please try again." });
        } finally {
            setIsResetting(false);
            setResetProgress(0);
        }
    };
    
    const handleClearAccountData = async () => {
        if (!user || !firestore || !selectedAccountToClear) return;

        setIsClearingAccount(true);
        
        try {
            const batch = writeBatch(firestore);
            let q, actionText = '';

            const expensesCol = collection(firestore, `users/${user.uid}/expenses`);

            if (selectedAccountToClear === 'all') {
                q = query(expensesCol);
                actionText = 'All transactions have been deleted from all accounts.';
            } else {
                const accountToClear = accounts?.find(a => a.id === selectedAccountToClear);
                if (!accountToClear) throw new Error('Selected account not found.');
                q = query(expensesCol, where('accountId', '==', selectedAccountToClear));
                
                const accountRef = doc(firestore, `users/${user.uid}/accounts`, selectedAccountToClear);
                batch.delete(accountRef);
                actionText = `Account "${accountToClear.name}" and its transactions have been deleted.`;
            }

            const expensesSnapshot = await getDocs(q);
            expensesSnapshot.forEach(expenseDoc => batch.delete(expenseDoc.ref));
            
            await commitBatchNonBlocking(batch, `users/${user.uid}`);
            
            toast({ title: 'Data Cleared', description: actionText });
            setSelectedAccountToClear(null);
            setTransactionCount(null);
            setClearConfirmationChecked(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Clearing Data', description: "Could not clear account data. Please try again." });
        } finally {
            setIsClearingAccount(false);
        }
    }
    
    const handleAccountDeletion = async () => {
        if (!user || !auth?.currentUser || !firestore) return;
        setIsDeletingAccount(true);
        setResetProgress(0);

        const collectionsToDelete: DeletableCollection[] = ['expenses', 'accounts', 'categories', 'tags', 'debts', 'assets', 'recurringExpenses'];
        
        try {
            const batch = writeBatch(firestore);
            
            for (const collectionName of collectionsToDelete) {
                 const colRef = collection(firestore, `users/${user.uid}/${collectionName}`);
                 const snapshot = await getDocs(colRef);
                 snapshot.docs.forEach(d => batch.delete(d.ref));
            }
            
            const userProfileRef = doc(firestore, `users/${user.uid}`);
            batch.delete(userProfileRef);

            await commitBatchNonBlocking(batch, `/users/${user.uid}`);
            setResetProgress(100);
            
            await deleteUser(auth.currentUser);
            
            toast({ title: "Account Closed", description: "Your account and all data have been permanently deleted." });
        } catch (error: any) {
             toast({ variant: 'destructive', title: "Account Deletion Failed", description: "There was an issue deleting your account data." });
        } finally {
            setIsDeletingAccount(false);
        }
    };


    const handleReauthenticate = async () => {
        if (!auth?.currentUser || !password) return;
        setIsDeletingAccount(true);

        try {
            if (!auth.currentUser.email) {
                toast({ variant: "destructive", title: "Authentication Error", description: "Current user's email is not available." });
                return;
            }
            const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
            await reauthenticateWithCredential(auth.currentUser, credential);
            
            setShowReauthDialog(false);
            
            // This is a bit of a hack to trigger the next dialog programmatically
            setTimeout(() => {
                document.getElementById('final-delete-trigger')?.click();
            }, 100);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Authentication Failed', description: "The password you entered was incorrect. Please try again." });
        } finally {
            setIsDeletingAccount(false);
            setPassword('');
        }
    };
    
    const selectedAccountName = selectedAccountToClear === 'all' 
        ? 'All Accounts' 
        : accounts?.find(a => a.id === selectedAccountToClear)?.name;

    return (
        <Card className="border-destructive/30">
            <CardHeader className="flex flex-row items-center gap-4">
                <AlertTriangle className="text-destructive h-6 w-6"/>
                <div>
                    <CardTitle className="text-destructive font-headline text-lg">Danger Zone</CardTitle>
                    <CardDescription>These actions are irreversible. Please be certain.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                
                {/* LOW SEVERITY */}
                <div className="rounded-lg border p-4">
                    <h4 className="font-semibold">Reset Data</h4>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">Permanently delete specific types of data from your account.</p>
                     <Dialog onOpenChange={(open) => !open && setCollectionsToReset([])}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">Select Data to Reset...</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Reset Data</DialogTitle>
                                <DialogDescription>
                                    This will permanently delete all selected items. This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 py-4">
                                {(Object.keys(collectionLabels) as DeletableCollection[]).map((key) => (
                                    <div key={key} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`reset-${key}`}
                                            checked={collectionsToReset.includes(key)}
                                            onCheckedChange={(checked) => {
                                                setCollectionsToReset(prev => 
                                                    checked ? [...prev, key] : prev.filter(c => c !== key)
                                                );
                                            }}
                                        />
                                        <Label htmlFor={`reset-${key}`} className="font-normal">{collectionLabels[key]}</Label>
                                    </div>
                                ))}
                            </div>
                            <DialogFooter>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" disabled={collectionsToReset.length === 0 || isResetting}>
                                            {isResetting ? <Loader2 className="animate-spin" /> : `Reset ${collectionsToReset.length} Item(s)`}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete all selected data. This action is irreversible.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleSelectiveReset} className="bg-destructive hover:bg-destructive/90">
                                                {isResetting ? <Loader2 className="animate-spin" /> : "Yes, delete data"}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* MEDIUM SEVERITY */}
                <div className="rounded-lg border p-4">
                    <h4 className="font-semibold">Clear Account Data</h4>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">Clear all transactions from an account, or all transactions from all accounts.</p>
                    <div className="flex gap-2">
                        <Select onValueChange={setSelectedAccountToClear} value={selectedAccountToClear || ''}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an account..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Accounts (Transactions Only)</SelectItem>
                                {accounts?.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {acc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" disabled={!selectedAccountToClear || isCheckingTransactions}>
                                    {isCheckingTransactions ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Clear...
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Clear data from "{selectedAccountName}"?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete <span className="font-bold">{transactionCount ?? 0} transactions</span> from {selectedAccountName === 'All Accounts' ? 'all of your accounts' : `the "${selectedAccountName}" account`}.
                                        {selectedAccountToClear !== 'all' && ` The account itself will also be deleted.`}
                                        <br/><br/>
                                        This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="flex items-center space-x-2 py-2">
                                    <Checkbox id="clear-confirm" checked={clearConfirmationChecked} onCheckedChange={(checked) => setClearConfirmationChecked(Boolean(checked))} />
                                    <Label htmlFor="clear-confirm" className="text-sm font-normal text-muted-foreground">I understand this action cannot be undone.</Label>
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setClearConfirmationChecked(false)}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleClearAccountData} disabled={!clearConfirmationChecked || isClearingAccount}>
                                        {isClearingAccount ? <Loader2 className="animate-spin" /> : "Yes, clear data"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                {/* EXTREME SEVERITY */}
                <div className="rounded-lg border border-destructive bg-destructive/5 p-4">
                    <h4 className="font-semibold text-destructive">Close Account Permanently</h4>
                    <p className="text-sm text-destructive/80 mt-1 mb-3">This will delete your user profile, all settings, and all financial data.</p>
                     
                    <Dialog open={showReauthDialog} onOpenChange={setShowReauthDialog}>
                        <DialogTrigger asChild>
                            <Button variant="destructive">Close My Account</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Re-authentication Required</DialogTitle>
                                <DialogDescription>For your security, please enter your password to proceed with account deletion.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 py-4">
                                <Label htmlFor="password">Password</Label>
                                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowReauthDialog(false)}>Cancel</Button>
                                <Button onClick={handleReauthenticate} variant="destructive" disabled={isDeletingAccount || !password}>
                                    {isDeletingAccount ? <Loader2 className="animate-spin" /> : "Confirm & Continue"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <button id="final-delete-trigger" className="hidden"></button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Final Confirmation</AlertDialogTitle>
                                <AlertDialogDescription>
                                     This action permanently deletes your account and all data. This includes all transactions, accounts, categories, and settings. This cannot be undone.
                                    <br/><br/>
                                    To confirm, please type <span className="font-bold text-foreground">CLOSE</span> below.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Input
                                value={closeConfirmationText}
                                onChange={(e) => setCloseConfirmationText(e.target.value)}
                                placeholder='Type CLOSE to confirm'
                                className="my-4"
                            />
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleAccountDeletion} disabled={closeConfirmationText !== 'CLOSE' || isDeletingAccount} className="bg-destructive hover:bg-destructive/90">
                                    {isDeletingAccount ? <Loader2 className="animate-spin" /> : "Delete My Account Forever"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    );
}
