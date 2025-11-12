
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Account, EnrichedExpense, UserProfile } from '@/lib/types';
import { FileDown, FileText, Bot, Loader2, UploadCloud, LogIn } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { GoogleAuthProvider, getAdditionalUserInfo, signInWithPopup, OAuthProvider } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ReportGeneratorProps {
    accounts: Account[];
    onDownload: (accountId: string, format: 'excel' | 'pdf') => void;
    isLoading: boolean;
}

export function ReportGenerator({ accounts, onDownload, isLoading }: ReportGeneratorProps) {
    const [selectedAccount, setSelectedAccount] = useState<string>('all');
    const [selectedFormat, setSelectedFormat] = useState<'excel' | 'pdf'>('excel');
    
    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Report Options</CardTitle>
                <CardDescription>Select the account and format for your report.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label>Account</label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount} disabled={isLoading}>
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
                     <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as 'excel' | 'pdf')} disabled={isLoading}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a format" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                            <SelectItem value="pdf" disabled>PDF (.pdf) - Coming Soon</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => onDownload(selectedAccount, selectedFormat)} disabled={isLoading}>
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        Download Report
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
