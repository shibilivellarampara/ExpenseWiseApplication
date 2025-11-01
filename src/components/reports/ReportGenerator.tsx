
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Account, EnrichedExpense } from '@/lib/types';
import { FileDown, FileText, Bot, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

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

    const handleDownload = () => {
        if (transactions.length === 0) return;
        setIsDownloading(true);

        if (selectedFormat === 'excel') {
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
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
                <div className="flex gap-2">
                    <Button onClick={() => onGenerate(selectedAccount, selectedFormat)} disabled={isLoading}>
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                        Generate Report
                    </Button>
                    {transactions.length > 0 && (
                        <Button onClick={handleDownload} disabled={isDownloading}>
                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Download Report
                        </Button>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">
                    Google Drive integration is coming soon.
                </p>
            </CardFooter>
        </Card>
    );
}
