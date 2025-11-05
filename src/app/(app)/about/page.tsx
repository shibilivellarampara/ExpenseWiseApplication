
'use client';

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { version as appVersion } from '../../../../package.json';

const changelog = [
    {
        version: "1.2.4",
        date: "2024-08-06",
        changes: [
            { type: 'Feature', description: "Optimized transaction list performance by implementing list virtualization for large datasets." },
        ]
    },
    {
        version: "1.2.3",
        date: "2024-08-05",
        changes: [
            { type: 'Fix', description: "Resolved multiple TypeScript type errors that were causing persistent build failures." },
            { type: 'Fix', description: "Corrected data handling in login, sign-up, and transaction forms to improve type safety." },
        ]
    },
    {
        version: "1.2.2",
        date: "2024-08-02",
        changes: [
            { type: 'Feature', description: "Added search functionality to the transactions page to filter by description and amount." },
            { type: 'Fix', description: "Changed the search input placeholder to be more concise." },
        ]
    },
    {
        version: "1.2.1",
        date: "2024-08-01",
        changes: [
            { type: 'Feature', description: "Implemented a true running balance calculation for all transactions, visible on the main list without requiring filtering." },
            { type: 'Fix', description: "Corrected bank account running balance to calculate forward from a starting balance of zero for the filtered period." },
        ]
    },
    {
        version: "1.2.0",
        date: "2024-07-31",
        changes: [
            { type: 'Feature', description: "Added 'Select All' checkbox to the Excel importer for easier account selection." },
            { type: 'Fix', description: "Updated 'Clear All Data' function to correctly delete accounts in addition to transactions." },
        ]
    },
    {
        version: "1.1.0",
        date: "2024-07-30",
        changes: [
            { type: 'Feature', description: "Initial release of ExpenseWise." },
        ]
    }
];

export default function AboutPage() {
    return (
        <div className="w-full space-y-8">
            <PageHeader
                title={`About ExpenseWise (v${appVersion})`}
                description="Track features, updates, and bug fixes for your application."
            />

            <div className="space-y-6">
                {changelog.map(entry => (
                     <Card key={entry.version}>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-4">
                                Version {entry.version}
                                <span className="text-sm font-normal text-muted-foreground">{entry.date}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                {entry.changes.map((change, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <Badge variant={change.type === 'Feature' ? 'default' : 'secondary'}>
                                            {change.type}
                                        </Badge>
                                        <p className="text-sm text-foreground">{change.description}</p>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
