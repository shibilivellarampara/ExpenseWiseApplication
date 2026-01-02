
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, Wallet, Edit, BarChart, Database, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { A2HSInstallPrompt } from '@/components/pwa/A2HSInstallPrompt';
import Link from 'next/link';

const steps = [
    {
        icon: Wallet,
        title: "Add your first account",
        description: "Create a wallet or bank account to start tracking expenses.",
        href: '/accounts'
    },
    {
        icon: Edit,
        title: "Record expenses",
        description: "Add daily expenses manually or via imports.",
        href: '/expenses'
    },
    {
        icon: BarChart,
        title: "View insights",
        description: "See where your money goes with charts and summaries.",
        href: '/analysis'
    },
    {
        icon: Database,
        title: "Backup & restore",
        description: "Secure your data and restore it anytime.",
        href: '/data'
    }
];

export function GettingStartedGuide() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Card className="shadow-sm">
            <CardHeader 
                className="flex flex-row items-center justify-between cursor-pointer p-4"
                onClick={() => setIsOpen(!isOpen)}
            >
                <CardTitle className="text-base font-semibold">Getting Started with ExpenseWise</CardTitle>
                <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
            </CardHeader>
            {isOpen && (
                <CardContent className="p-4 pt-0 space-y-4">
                     {steps.map((step) => (
                        <Link href={step.href} key={step.title} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted transition-colors">
                           <div className="flex-shrink-0 bg-primary/10 text-primary h-8 w-8 rounded-full flex items-center justify-center mt-0.5">
                                <step.icon className="h-5 w-5" />
                           </div>
                           <div>
                               <p className="font-semibold text-sm">{step.title}</p>
                               <p className="text-xs text-muted-foreground">{step.description}</p>
                           </div>
                        </Link>
                    ))}
                </CardContent>
            )}
        </Card>
    );
}
