
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
import { useCollection, useFirestore, useUser, useAuth, useMemoFirebase } from "@/firebase";
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

export function DataManagementSettings() {
    const { user } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isClearing, setIsClearing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [showReauthDialog, setShowReauthDialog] = useState(false);
    const [password, setPassword] = useState('');


    const accountsQuery = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/accounts`) : null
    , [firestore, user]);
    const { data: accounts } = useCollection<Account>(accountsQuery);

    const renderIcon = (iconName: string | undefined, className?: string) => {
        if (!iconName) return <LucideIcons.Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className={cn("h-4 w-4 text-muted-foreground", className)} /> : <LucideIcons.Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
    };

    const handleClearAllData = async () => {
        if (!user || !firestore) return;
        setIsClearing(true);
        try {
            const batch = writeBatch(firestore);

            // 1. Delete all expenses
            const expensesQuery = collection(firestore, `users/${user.uid}/expenses`);
            const expensesSnapshot = await getDocs(expensesQuery);
            expensesSnapshot.forEach(doc => batch.delete(doc.ref));

            // 2. Reset all account balances
            if (accounts) {
                accounts.forEach(account => {
                    const accountRef = doc(firestore, `users/${user.uid}/accounts`, account.id);
                    batch.update(accountRef, { balance: 0 });
                });
            }

            await batch.commit();
            toast({ title: 'All data cleared', description: 'All your transactions have been deleted and balances reset.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsClearing(false);
        }
    };
    
    const handleClearAccountData = async () => {
        if (!user || !firestore || !selectedAccount) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select an account to clear.' });
            return;
        }
        setIsClearing(true);
        try {
            const batch = writeBatch(firestore);
            
            // 1. Delete all expenses for the selected account
            const expensesQuery = collection(firestore, `users/${user.uid}/expenses`);
            const expensesSnapshot = await getDocs(expensesQuery);
            expensesSnapshot.forEach(expenseDoc => {
                if (expenseDoc.data().accountId === selectedAccount) {
                    batch.delete(expenseDoc.ref);
                }
            });

            // 2. Reset the selected account balance
            const accountRef = doc(firestore, `users/${user.uid}/accounts`, selectedAccount);
            batch.update(accountRef, { balance: 0 });
            
            await batch.commit();

            const accountName = accounts?.find(a => a.id === selectedAccount)?.name || "the account";
            toast({ title: 'Account Data Cleared', description: `Transactions for ${accountName} have been deleted and its balance reset.` });
            setSelectedAccount(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsClearing(false);
        }
    }
    
    const handleAccountDeletion = async () => {
        if (!user || !auth?.currentUser || !firestore) return;
        setIsDeleting(true);

        try {
            const batch = writeBatch(firestore);

            const collectionsToDelete = ['expenses', 'accounts', 'categories', 'tags', 'contributions'];
            for (const c of collectionsToDelete) {
                const snapshot = await getDocs(collection(firestore, `users/${user.uid}/${c}`));
                snapshot.forEach(d => batch.delete(d.ref));
            }
            
            // Delete shared expenses owned by the user
            const sharedExpensesQuery = query(collection(firestore, 'shared_expenses'), where('ownerId', '==', user.uid));
            const sharedExpensesSnapshot = await getDocs(sharedExpensesQuery);
            sharedExpensesSnapshot.forEach(doc => batch.delete(doc.ref));

            // Delete the user profile doc
            const userProfileRef = doc(firestore, `users/${user.uid}`);
            batch.delete(userProfileRef);

            await batch.commit();

            // Finally, delete the user from auth
            await deleteUser(user);
            
            toast({ title: "Account Closed", description: "Your account and all data have been permanently deleted." });
            // The user will be redirected automatically due to auth state change.
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Deletion Failed', description: `Could not delete account data. ${error.message}` });
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
            
            // If re-authentication is successful, close the password dialog
            // and open the final confirmation dialog.
            setShowReauthDialog(false);
            
            // We use a timeout to allow the first dialog to close before opening the next.
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
                        <div className="flex items-center gap-2">
                             <AlertTriangle className="text-destructive h-6 w-6"/>
                            <div>
                                <h3 className="text-lg font-semibold font-headline text-destructive">Danger Zone</h3>
                                <CardDescription>These actions are irreversible. Please be certain before proceeding.</CardDescription>
                            </div>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="space-y-4">
                        <div className="rounded-lg border border-destructive/50 p-4">
                            <h4 className="font-semibold">Clear All Transaction Data</h4>
                            <p className="text-sm text-muted-foreground mt-1 mb-3">This will permanently delete all your transactions and reset every account balance to zero.</p>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">Clear All Data</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. All transactions will be deleted and account balances will be set to 0.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleClearAllData} className="bg-destructive hover:bg-destructive/90">
                                            {isClearing ? <Loader2 className="animate-spin" /> : "Yes, clear everything"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>

                        <div className="rounded-lg border border-destructive/50 p-4">
                            <h4 className="font-semibold">Clear Specific Account Data</h4>
                            <p className="text-sm text-muted-foreground mt-1 mb-3">Select an account to delete all its associated transactions and reset its balance to zero.</p>
                            <div className="flex gap-2">
                                <Select onValueChange={setSelectedAccount} value={selectedAccount || ''}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an account" />
                                    </SelectTrigger>
                                    <SelectContent>
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
                                        <Button variant="destructive" size="sm" disabled={!selectedAccount}>Clear Account</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Clear data for "{accounts?.find(a => a.id === selectedAccount)?.name}"?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete all transactions for this account and reset its balance. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleClearAccountData} className="bg-destructive hover:bg-destructive/90">
                                                {isClearing ? <Loader2 className="animate-spin" /> : "Yes, clear account data"}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>

                        <div className="rounded-lg border border-destructive/50 p-4">
                            <h4 className="font-semibold">Close Account</h4>
                            <p className="text-sm text-muted-foreground mt-1 mb-3">This will permanently delete your account and all associated data. This action is irreversible.</p>
                            
                            <Dialog open={showReauthDialog} onOpenChange={setShowReauthDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="destructive" size="sm">Close My Account</Button>
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
