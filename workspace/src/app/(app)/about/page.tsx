'use client';

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import pkg from '@/../package.json';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils";

const appVersion = pkg.version;

const changelog = [
    {
        version: "1.8.3",
        date: "Feb 18, 2026",
        changes: [
            { type: 'UI/UX', description: "Finalized premium fintech redesign for Accounts and Debts with elevated summary cards and unified search headers." },
            { type: 'UI/UX', description: "Implemented themed fade-out effects for all progress bars, enhancing visual clarity for credit utilization." },
            { type: 'UI/UX', description: "Contextualized filter cancellation in the Debts UI by moving clear buttons inside respective stat boxes." },
            { type: 'Feature', description: "Stabilized the 'Recurring Transactions' module by resolving invalid Firebase document references and segment mismatches." },
            { type: 'Logic', description: "Synchronized v1.8.2 logic and UI refinements across production and workspace environments for global consistency." },
        ]
    },
    {
        version: "1.8.2",
        date: "Feb 18, 2026",
        changes: [
            { type: 'Feature', description: "Introduced 'Recurring Transactions' management to automate tracking for regular bills and subscriptions." },
            { type: 'Feature', description: "Dashboard 'Total Monthly Expense' now automatically excludes the 'Transfer' category for more accurate spending tracking." },
            { type: 'UI/UX', description: "Redesigned the Accounts and Debts pages with a premium fintech summary card and unified search/add headers." },
            { type: 'UI/UX', description: "Implemented semantic theme coloring: Blue/Orange for Fintech and Green/Red for Chat themes." },
            { type: 'UI/UX', description: "Optimized transaction list rendering by removing internal scroll constraints for a more natural natural feel." },
            { type: 'Fix', description: "Resolved critical JSX tag mismatch and syntax errors in forms and dashboard stats to ensure production stability." },
        ]
    },
    {
        version: "1.8.1",
        date: "Feb 16, 2026",
        changes: [
            { type: 'Feature', description: "Enforced centered dialog popup for Asset entry across all devices for a consistent premium feel." },
            { type: 'Feature', description: "Standardized 'Add Asset' form with high-quality floating labels and smart invested/current amount fallback logic." },
            { type: 'Fix', description: "Corrected module resolution for DateTimePicker and package.json to ensure stable production builds." },
        ]
    },
    {
        version: "1.8.0",
        date: "Feb 12, 2026",
        changes: [
            { type: 'Feature', description: "Implemented auto-calculation for credit card due dates (set to 15 days after statement date if left empty)." },
            { type: 'Feature', description: "Redesigned the 'Add Account' form with a logic-first field order and floating labels for a better user experience." },
            { type: 'UI/UX', description: "Enhanced form accessibility by preventing automatic keyboard popup on form open." },
        ]
    }
];

const getTagColor = (type: string) => {
    switch (type) {
        case 'Feature':
            return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
        case 'UI':
        case 'UI/UX':
            return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
        case 'Fix':
        case 'Security':
            return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
        case 'Logic':
            return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
        default:
            return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
};

export default function AboutPage() {
    const latestVersion = changelog.slice(0, 1).map(v => v.version);

    return (
        <div className="w-full max-w-2xl mx-auto pb-32">
            <PageHeader
                title="Release Notes"
                description="Release notes and improvements."
            >
                <Button variant="outline" asChild size="sm" className="text-muted-foreground hover:text-foreground">
                    <Link href="/profile">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Link>
                </Button>
            </PageHeader>

            <div className="relative mt-10 pl-10 border-l-[2px] border-primary/10 chat:border-primary/20 fintech:border-primary/20 space-y-16">
                <Accordion type="multiple" defaultValue={latestVersion} className="space-y-12">
                    {changelog.map((entry) => (
                        <div key={entry.version} className="relative group">
                            <div className="absolute -left-[49px] top-1.5 h-[18px] w-[18px] rounded-full bg-background border-[3px] border-primary/20 chat:border-primary/30 fintech:border-primary/30 group-data-[state=open]:border-primary group-data-[state=open]:chat:border-primary group-data-[state=open]:fintech:border-primary z-10 transition-colors" />
                            
                            <AccordionItem value={entry.version} className="border-none transition-all duration-300 rounded-xl data-[state=open]:bg-primary/[0.03] data-[state=open]:px-4 data-[state=open]:-mx-4">
                                <AccordionTrigger className="hover:no-underline py-0 items-start gap-2 text-left">
                                    <div className="flex flex-col items-start space-y-2">
                                        <h3 className="text-[18px] font-bold tracking-tight text-foreground/90 group-data-[state=open]:text-foreground">
                                            Version {entry.version}
                                        </h3>
                                        <p className="text-[14px] font-medium text-muted-foreground/70 uppercase tracking-widest">
                                            {entry.date}
                                        </p>
                                    </div>
                                </AccordionTrigger>
                                
                                <AccordionContent className="pt-6 pb-4">
                                    <div className="space-y-5">
                                        <ul className="space-y-5">
                                            {entry.changes.map((change, changeIndex) => (
                                                <li key={changeIndex} className="flex flex-col sm:flex-row sm:items-start gap-3 group/item">
                                                    <Badge 
                                                        variant="outline"
                                                        className={cn(
                                                            "w-fit px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest transition-colors shrink-0",
                                                            getTagColor(change.type)
                                                        )}
                                                    >
                                                        {change.type}
                                                    </Badge>
                                                    <p className="text-[15px] leading-relaxed text-foreground/70 group-hover/item:text-foreground transition-colors">
                                                        {change.description}
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </div>
                    ))}
                </Accordion>
            </div>
            
            <div className="text-center pt-16 mt-8 border-t border-muted/50">
                <p className="text-xs font-medium text-muted-foreground/50 tracking-wide uppercase">
                    ExpenseWise &bull; v{appVersion} &bull; Built with pride.
                </p>
            </div>
        </div>
    );
}
