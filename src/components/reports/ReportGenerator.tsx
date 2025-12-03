
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Account } from '@/lib/types';
import { FileDown, Loader2, Share2, ClipboardCopy } from 'lucide-react';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { useToast } from '@/hooks/use-toast';

interface ReportGeneratorProps {
    accounts: Account[];
    onAction: (accountId: string, format: 'excel' | 'share', template: string) => void;
    isLoading: boolean;
    progress: number;
}

export function ReportGenerator({ accounts, onAction, isLoading, progress }: ReportGeneratorProps) {
    const [selectedAccount, setSelectedAccount] = useState<string>('all');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('enhanced');
    const [shareText, setShareText] = useState<string | null>(null);
    const { toast } = useToast();

    const handleShare = async () => {
        if (!shareText) return;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'ExpenseWise Report',
                    text: shareText,
                });
                toast({ title: "Shared Successfully" });
            } else {
                toast({ variant: 'destructive', title: "Share Not Supported", description: "Your browser does not support this feature." });
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                toast({ variant: 'destructive', title: "Error Sharing", description: error.message });
            }
        } finally {
            setShareText(null); // Clear after sharing attempt
        }
    };
    
    const copyToClipboard = () => {
        if (!shareText) return;
        navigator.clipboard.writeText(shareText);
        toast({ title: "Copied!", description: "Report data copied to clipboard." });
    }

    const handleGenerateForShare = () => {
        onAction(selectedAccount, 'share', selectedTemplate);
    }
    
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
                            <SelectItem value="enhanced">Enhanced report</SelectItem>
                             <SelectItem value="expensewise">ExpenseWise Report</SelectItem>
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
                    <Button variant="outline" onClick={handleShare} disabled={isLoading}>
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                        Share
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
