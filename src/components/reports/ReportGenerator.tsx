
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Account } from '@/lib/types';
import { FileDown, Loader2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReportGeneratorProps {
    accounts: Account[];
    onAction: (accountId: string, format: 'excel' | 'clipboard') => void;
    isLoading: boolean;
}

export function ReportGenerator({ accounts, onAction, isLoading }: ReportGeneratorProps) {
    const [selectedAccount, setSelectedAccount] = useState<string>('all');
    
    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Report Options</CardTitle>
                <CardDescription>Select an account to generate a report for.</CardDescription>
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
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => onAction(selectedAccount, 'excel')} disabled={isLoading}>
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        Download Excel
                    </Button>
                    <Button variant="outline" onClick={() => onAction(selectedAccount, 'clipboard')} disabled={isLoading}>
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                        Copy to Clipboard
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
