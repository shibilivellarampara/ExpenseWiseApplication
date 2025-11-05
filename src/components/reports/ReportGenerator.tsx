

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Account, EnrichedExpense, UserProfile } from '@/lib/types';
import { FileDown, FileText, Bot, Loader2, UploadCloud, LogIn } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth, useUser } from '@/firebase';
import { GoogleAuthProvider, getAdditionalUserInfo, signInWithPopup } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';


async function uploadToGoogleDrive(accessToken: string, file: Blob, fileName: string) {
    const metadata = {
        name: fileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
        body: form,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google Drive upload failed: ${error.error.message}`);
    }

    return await response.json();
}

interface ReportGeneratorProps {
    accounts: Account[];
    transactions: EnrichedExpense[];
    onGenerate: (accountId: string, format: 'excel' | 'pdf') => void;
    isLoading: boolean;
}

export function ReportGenerator({ accounts, onGenerate, transactions, isLoading }: ReportGeneratorProps) {
    const [selectedAccount, setSelectedAccount] = useState<string>('all');
    const [selectedFormat, setSelectedFormat] = useState<'excel' | 'pdf'>('excel');
    const [isDownloading, setIsDownloading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [driveConnected, setDriveConnected] = useState(false);
    
    const { user } = useUser();
    const auth = useAuth();
    const { toast } = useToast();

    const handleConnectDrive = async () => {
        if (!auth || !user) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please sign in first.' });
            return;
        }

        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/drive.file');

        try {
            await signInWithPopup(auth, provider);
            toast({ title: 'Google Drive Connected', description: 'You can now upload reports to your drive.' });
            setDriveConnected(true);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Connection Failed', description: error.message });
        }
    }

    const blobToByteArray = (blob: Blob): Promise<Uint8Array> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(new Uint8Array(reader.result as ArrayBuffer));
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    };
    

    const handleUpload = async () => {
        if (transactions.length === 0 || !user || !auth.currentUser) return;
        setIsUploading(true);

        try {
            const idToken = await auth.currentUser.getIdToken(true);
            const accessToken = (getAdditionalUserInfo(await signInWithPopup(auth, new GoogleAuthProvider().addScope('https://www.googleapis.com/auth/drive.file')))?.oauthAccessToken)
            if (!accessToken) {
                throw new Error("Could not retrieve Google Drive access token. Please reconnect.");
            }

            const fileName = `ExpenseWise_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            const wb = createWorkbook();
            
            const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/octet-stream' });
        
            await uploadToGoogleDrive(accessToken, blob, fileName);

            toast({ title: 'Upload Successful', description: 'Your report has been saved to Google Drive.' });

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        } finally {
            setIsUploading(false);
        }
    };


    const createWorkbook = () => {
         const dataToExport = transactions.map(tx => ({
            Date: tx.date.toLocaleDateString(),
            Time: tx.date.toLocaleTimeString(),
            Description: tx.description,
            Category: tx.category?.name || 'N/A',
            Account: tx.account?.name || 'N/A',
            'Amount (INR)': tx.amount,
            Type: tx.type,
            Tags: tx.tags.map(t => t.name).join(', '),
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
        return workbook;
    }

    const handleDownload = () => {
        if (transactions.length === 0) return;
        setIsDownloading(true);

        if (selectedFormat === 'excel') {
            const workbook = createWorkbook();
            XLSX.writeFile(workbook, `ExpenseWise_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
        
        setIsDownloading(false);
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Report Options</CardTitle>
                <CardDescription>Select the account and format for your report.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label>Account</label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Accounts</SelectItem>
                            {accounts.map(account => (
                                <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label>Format</label>
                     <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as 'excel' | 'pdf')}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a format" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                            <SelectItem value="pdf" disabled>PDF (.pdf) - Coming Soon</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="rounded-lg border bg-muted/50 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M12.19 2L5.86 8.33L2 12.19L8.33 18.52L12.19 22L18.52 15.67L22 12L15.67 5.67L12.19 2Z" fill="#00AA44"></path><path d="M15.67 5.67L12 2L8.33 5.67L12 9.34L15.67 5.67Z" fill="#FFC700"></path><path d="M5.86 8.33L2 12.19L5.67 15.86L9.34 12.19L5.86 8.33Z" fill="#0066DA"></path><path d="M18.52 15.67L22 12L18.67 8.67L15 12.34L18.52 15.67Z" fill="#E53935"></path><path d="M8.33 18.52L12.19 22L15.86 18.52L12.19 14.85L8.33 18.52Z" fill="#FFC700"></path></svg>
                        <div>
                            <h4 className="font-medium">Google Drive</h4>
                            <p className="text-xs text-muted-foreground">{driveConnected ? 'Connected. You can upload reports.' : 'Connect to upload reports to Drive.'}</p>
                        </div>
                    </div>
                     {!driveConnected && (
                         <Button variant="outline" size="sm" onClick={handleConnectDrive}>
                            <LogIn className="mr-2 h-4 w-4" />
                            Connect
                        </Button>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => onGenerate(selectedAccount, selectedFormat)} disabled={isLoading}>
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                        Generate Report
                    </Button>
                    {transactions.length > 0 && (
                        <>
                        <Button onClick={handleDownload} disabled={isDownloading}>
                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Download Report
                        </Button>
                         <Button onClick={handleUpload} disabled={isUploading || !driveConnected}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                            Upload to Drive
                        </Button>
                        </>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}
