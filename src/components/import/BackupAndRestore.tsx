'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Loader2, Download, Upload, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import pkg from '../../../package.json';

const appVersion = pkg.version;

const COLLECTIONS_TO_BACKUP = ['userProfile', 'accounts', 'categories', 'tags', 'expenses', 'debts', 'assets', 'recurringExpenses'];

export function BackupAndRestore() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreStep, setRestoreStep] = useState<'idle' | 'confirm' | 'progress' | 'complete'>('idle');
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [restoreData, setRestoreData] = useState<any>(null);
    const [progress, setProgress] = useState(0);

    const handleBackup = async () => {
        if (!user || !firestore) return;
        setIsBackingUp(true);
        setProgress(0);
        try {
            const backupData: { [key: string]: any } = {};
            
            for (const collectionName of COLLECTIONS_TO_BACKUP) {
                if (collectionName === 'userProfile') {
                    const docRef = doc(firestore, `users/${user.uid}`);
                    const docSnap = await getDocs(query(collection(firestore, 'users'), where('id', '==', user.uid)));
                    if (!docSnap.empty) {
                        backupData.userProfile = docSnap.docs[0].data();
                    }
                } else {
                    const colRef = collection(firestore, `users/${user.uid}/${collectionName}`);
                    const snapshot = await getDocs(colRef);
                    backupData[collectionName] = snapshot.docs.map(d => d.data());
                }
                setProgress(prev => prev + (100 / COLLECTIONS_TO_BACKUP.length));
            }

            const finalBackup = {
                version: appVersion,
                createdAt: new Date().toISOString(),
                dataType: 'ExpenseWiseFullBackup',
                data: backupData
            };
            
            const jsonString = JSON.stringify(finalBackup, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `expensewise_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            toast({ title: 'Backup Successful', description: 'Your data has been downloaded.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Backup Failed', description: error.message });
        } finally {
            setIsBackingUp(false);
            setProgress(0);
        }
    };
    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (data.dataType !== 'ExpenseWiseFullBackup' || !data.data) {
                    throw new Error('Invalid backup file format.');
                }
                setRestoreFile(file);
                setRestoreData(data.data);
                setRestoreStep('confirm');
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Invalid File', description: error.message });
                setRestoreFile(null);
                setRestoreData(null);
            }
        };
        reader.readAsText(file);
    };
    
    const handleRestore = async () => {
        if (!user || !firestore || !restoreData) return;

        setRestoreStep('progress');
        setIsRestoring(true);
        setProgress(0);

        try {
            // Step 1: Delete all existing data
            const deleteBatch = writeBatch(firestore);
            for (const collectionName of COLLECTIONS_TO_BACKUP) {
                 if (collectionName === 'userProfile') continue; // Don't delete the user doc itself
                 const colRef = collection(firestore, `users/${user.uid}/${collectionName}`);
                 const snapshot = await getDocs(colRef);
                 snapshot.docs.forEach(d => deleteBatch.delete(d.ref));
            }
            await deleteBatch.commit();
            setProgress(50);

            // Step 2: Restore from backup
            const restoreBatch = writeBatch(firestore);
            for (const collectionName of COLLECTIONS_TO_BACKUP) {
                const dataToRestore = restoreData[collectionName];
                if (dataToRestore) {
                    if (collectionName === 'userProfile') {
                        const docRef = doc(firestore, `users/${user.uid}`);
                        // Exclude sensitive/unchangeable fields
                        const { id, email, ...profileData } = dataToRestore;
                        restoreBatch.set(docRef, profileData, { merge: true });
                    } else {
                        dataToRestore.forEach((item: any) => {
                             const itemRef = doc(firestore, `users/${user.uid}/${collectionName}`, item.id);
                             restoreBatch.set(itemRef, item);
                        });
                    }
                }
            }
            await restoreBatch.commit();
            setProgress(100);
            setRestoreStep('complete');
            
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Restore Failed', description: error.message });
            resetRestore();
        } finally {
            setIsRestoring(false);
        }
    };
    
    const resetRestore = () => {
        setRestoreFile(null);
        setRestoreData(null);
        setRestoreStep('idle');
        setProgress(0);
    }

    if (restoreStep === 'complete') {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center text-center p-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                    <h3 className="text-xl font-semibold">Restore Successful</h3>
                    <p className="text-muted-foreground mt-2">Your data has been restored. The page will now reload.</p>
                    <Button onClick={() => window.location.reload()} className="mt-4">
                        Reload Page
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Backup Data</CardTitle>
                    <CardDescription>Download a complete backup of all your data as a single JSON file.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isBackingUp && <Progress value={progress} />}
                </CardContent>
                <CardFooter>
                    <Button onClick={handleBackup} disabled={isBackingUp}>
                        {isBackingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Backup All Data
                    </Button>
                </CardFooter>
            </Card>
            <Card className="border-destructive/50">
                 <CardHeader>
                    <CardTitle className="text-destructive">Restore Data</CardTitle>
                    <CardDescription>Restore your account from a previously downloaded backup file.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border-2 border-dashed border-destructive/50 p-4 text-center">
                        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-destructive">
                            <AlertTriangle className="h-4 w-4" />
                            Warning: This is a destructive action.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Restoring will first delete all current data in your account.</p>
                    </div>
                     {restoreStep === 'progress' && <Progress value={progress} className="mt-4 [&>div]:bg-destructive" />}
                </CardContent>
                <CardFooter>
                     <AlertDialog open={restoreStep === 'confirm'} onOpenChange={(open) => !open && resetRestore()}>
                        <AlertDialogContent>
                             <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Restore</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You are about to restore from file <span className="font-bold">{restoreFile?.name}</span>. This will <span className="font-bold text-destructive">delete all existing data</span> before importing the backup. Are you sure you want to continue?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleRestore} className="bg-destructive hover:bg-destructive/90">
                                    {isRestoring ? <Loader2 className="animate-spin" /> : "Yes, Delete & Restore"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialog>
                        <Button variant="destructive" onClick={() => document.getElementById('restore-file-input')?.click()} disabled={isRestoring}>
                            {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Select Backup File
                        </Button>
                        <input type="file" id="restore-file-input" accept=".json" className="hidden" onChange={handleFileSelect} />
                </CardFooter>
            </Card>
        </div>
    );
}
