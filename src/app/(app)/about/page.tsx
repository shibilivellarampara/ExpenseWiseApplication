'use client';

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import pkg from '../../../../package.json';

const appVersion = pkg.version;


const changelog = [
    {
        version: "1.7.9",
        date: "2026-02-01",
        changes: [
            { type: 'Fix', description: "Resolved a persistent issue with form submission in the 'Add Account' view where hidden fields caused validation failures." },
            { type: 'UI/UX', description: "Implemented a more robust context-driven field order for the 'Add Account' form." },
            { type: 'UI/UX', description: "Improved form responsiveness and loading states for a smoother entry experience." },
        ]
    },
    {
        version: "1.7.8",
        date: "2026-01-31",
        changes: [
            { type: 'Fix', description: "Resolved a critical build failure caused by incorrect component import paths on the 'Debts & Dues' page." },
            { type: 'UI/UX', description: "Clarified the 'Net Position' label on the Debts summary to dynamically show 'Net Owed' or 'You Owe'." },
            { type: 'UI/UX', description: "Made the Debts summary card more compact for a cleaner look." },
        ]
    }
];

export default function AboutPage() {
    return (
        <div className="w-full space-y-8">
            <PageHeader
                title={`About ExpenseWise (v${appVersion})`}
                description="Track features, updates, and bug fixes for your application."
            >
                <Button variant="outline" asChild>
                    <Link href="/profile">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Settings
                    </Link>
                </Button>
            </PageHeader>

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
                                        <Badge variant={change.type === 'Feature' || change.type === 'UI' || change.type === 'UI/UX' || change.type === 'Security' || change.type === 'DevEx' ? 'default' : 'secondary'}>
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
