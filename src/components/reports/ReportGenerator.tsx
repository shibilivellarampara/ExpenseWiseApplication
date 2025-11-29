
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Account } from '@/lib/types';
import { FileDown, Loader2, Copy } from 'lucide-react';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';

interface ReportGeneratorProps {
    accounts: Account[];
    onAction: (accountId: string, format: 'excel' | 'clipboard', template: string) => void;
    isLoading: boolean;
    progress: number;
}

export function ReportGenerator({ accounts, onAction, isLoading, progress }: ReportGeneratorProps) {
    const [selectedAccount, setSelectedAccount] = useState<string>('all');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('default');
    
    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Report Options</CardTitle>
                <CardDescription>Select an account and template to generate a report.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="report-template">Report Template</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate} disabled={isLoading}>
                        <SelectTrigger id="report-template">
                            <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="default">Default Report</SelectItem>
                            <SelectItem value="enhanced">Enhanced report</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="report-account">Account</Label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount} disabled={isLoading}>
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
                 {isLoading && (
                    <div className="w-full space-y-2">
                        <Progress value={progress} />
                        <p className="text-sm text-muted-foreground text-center">Generating your report...</p>
                    </div>
                )}
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => onAction(selectedAccount, 'excel', selectedTemplate)} disabled={isLoading}>
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        Download Excel
                    </Button>
                    <Button variant="outline" onClick={() => onAction(selectedAccount, 'clipboard', selectedTemplate)} disabled={isLoading}>
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                        Copy to Clipboard
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
