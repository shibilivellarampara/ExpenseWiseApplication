
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Account } from '@/lib/types';
import { FileDown, Loader2, Share2, ClipboardCopy, UploadCloud } from 'lucide-react';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useGoogleDrive } from '@/hooks/use-google-drive';
import { uploadToGoogleDrive } from '@/ai/flows/upload-to-google-drive';
import * as XLSX from 'xlsx';

interface ReportGeneratorProps {
    accounts: Account[];
    onAction: (accountId: string, format: 'excel' | 'share' | 'gdrive', template: string) => Promise<any>;
    isLoading: boolean;
    progress: number;
}

export function ReportGenerator({ accounts, onAction, isLoading, progress }: ReportGeneratorProps) {
    const [selectedAccount, setSelectedAccount] = useState<string>('all');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('enhanced');
    const { toast } = useToast();
    const { openPicker, isPickerOpen } = useGoogleDrive();
    const [isUploading, setIsUploading] = useState(false);

    const handleGoogleDriveBackup = async () => {
        const dataToExport = await onAction(selectedAccount, 'gdrive', selectedTemplate);
        if (!dataToExport || dataToExport.length === 0) {
            toast({ variant: 'destructive', title: 'No data to export' });
            return;
        }

        openPicker({
            developerKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
            viewId: "DOCS_FOLDERS",
            supportDrives: true,
            callbackFunction: async (data) => {
                if (data.action === 'picked') {
                    setIsUploading(true);
                    const folder = data.docs[0];
                    const accessToken = (window as any).gapi.auth.getToken().access_token;
                    
                    const ws = XLSX.utils.json_to_sheet(dataToExport);
                    const csvContent = XLSX.utils.sheet_to_csv(ws);

                    try {
                        const result = await uploadToGoogleDrive({
                            accessToken,
                            fileContent: csvContent,
                            fileName: `ExpenseWise_Report_${new Date().toISOString().split('T')[0]}.csv`,
                            folderId: folder.id,
                        });
                         toast({
                            title: "Upload Successful!",
                            description: "Your report has been saved to Google Drive.",
                            action: <a href={result.webViewLink} target="_blank" rel="noopener noreferrer"><Button variant="outline">View File</Button></a>,
                        });
                    } catch (error: any) {
                         toast({
                            variant: 'destructive',
                            title: "Upload Failed",
                            description: "Could not upload to Google Drive. Please ensure you have the correct permissions."
                        });
                    } finally {
                        setIsUploading(false);
                    }
                }
            },
        });
    };
    
    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Report Options</CardTitle>
                <CardDescription>Select an account and template to generate a report.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="report-template">Report Template</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate} disabled={isLoading || isUploading}>
                        <SelectTrigger id="report-template">
                            <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="enhanced">Enhanced report</SelectItem>
                             <SelectItem value="expensewise">ExpenseWise Report</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="report-account">Account</Label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount} disabled={isLoading || isUploading}>
                        <SelectTrigger id="report-account">
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
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
                 {(isLoading || isUploading) && (
                    <div className="w-full space-y-2">
                        <Progress value={isLoading ? progress : undefined} className={isUploading ? "animate-pulse" : ""} />
                        <p className="text-sm text-muted-foreground text-center">
                            {isLoading ? 'Generating your report...' : 'Uploading to Google Drive...'}
                        </p>
                    </div>
                )}
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => onAction(selectedAccount, 'excel', selectedTemplate)} disabled={isLoading || isUploading}>
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        Download Excel
                    </Button>
                    <Button onClick={handleGoogleDriveBackup} variant="outline" disabled={isLoading || isUploading || isPickerOpen}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        Backup to Google Drive
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
