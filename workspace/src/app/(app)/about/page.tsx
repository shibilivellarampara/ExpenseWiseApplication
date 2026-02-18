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
        version: "1.8.5",
        date: "Feb 18, 2026",
        changes: [
            { type: 'Logic', description: "Optimized transaction loading with dual-query architecture: 50-record pagination for speed + accurate summary totals." },
            { type: 'Fix', description: "Resolved critical JSX syntax errors in AssetsList that caused production build failures." },
            { type: 'Feature', description: "Implemented specific Month & Year picker in Analysis filters for historical deep-dives." },
            { type: 'UI/UX', description: "Redesigned Category Analysis list with a tiered metadata stack and full-width progress bars." },
            { type: 'UI/UX', description: "Enhanced 'Hidden Categories' management with a descriptive popover and inline toggle." },
            { type: 'UI/UX', description: "Added 'All Tags' clear option to Analysis filters for faster interaction." },
            { type: 'Logic', description: "Refined 'Net' view by hiding percentages to avoid balance-based calculation confusion." },
        ]
    },
    {
        version: "1.8.4",
        date: "Feb 18, 2026",
        changes: [
            { type: 'UI/UX', description: "Implemented responsive typography for summary cards, ensuring amounts scale gracefully on mobile devices." },
            { type: 'UI/UX', description: "Aligned Asset performance visuals with semantic themes: primary for gains and destructive for losses." },
            { type: 'UI/UX', description: "Applied global shadow-md elevation to all major dashboard cards for enhanced visual depth." },
            { type: 'Fix', description: "Resolved critical ReferenceErrors for 'orderBy' and 'Badge' across various holding components." },
            { type: 'Logic', description: "Standardized the premium fintech UI setup across Accounts, Debts, and Assets screens." },
        ]
    },
    {
        version: "1.8.3",
        date: "Feb 15, 2026",
        changes: [
            { type: 'Fix', description: "Corrected z-index stacking issues for the bottom navigation menu on high-resolution displays." },
            { type: 'UI/UX', description: "Refined the 'Add Transaction' floating action button with smoother scale animations." },
        ]
    },
    {
        version: "1.8.2",
        date: "Feb 12, 2026",
        changes: [
            { type: 'Logic', description: "Enhanced recurring transaction date calculations to handle month-end boundary conditions correctly." },
            { type: 'UI/UX', description: "Updated icon library with specialized Fintech-themed SVG assets." },
        ]
    },
    {
        version: "1.8.1",
        date: "Feb 11, 2026",
        changes: [
            { type: 'Feature', description: "Added 'Quick Re-sync' button to the dashboard for manual Firestore cache refreshing." },
            { type: 'Fix', description: "Fixed a bug where credit card billing dates were displaying as UTC instead of local time." },
        ]
    },
    {
        version: "1.8.0",
        date: "Feb 10, 2026",
        changes: [
            { type: 'Feature', description: "Launched 'Recurring Transactions' module for automated tracking of subscriptions and bills." },
            { type: 'Logic', description: "Implemented automatic Credit Card Due Date calculation (Statement Date + 15 days)." },
            { type: 'UI/UX', description: "Enhanced transaction form with floating labels and refined date-time pickers." },
        ]
    },
    {
        version: "1.7.5",
        date: "Feb 05, 2026",
        changes: [
            { type: 'Logic', description: "Optimized debt grouping logic to handle identical person names across different user profiles." },
            { type: 'Security', description: "Strengthened Firebase Security Rules for debt subcollections." },
        ]
    },
    {
        version: "1.7.2",
        date: "Feb 03, 2026",
        changes: [
            { type: 'Feature', description: "Integrated 'Settle Up' logic for Debts, allowing users to balance outstanding dues with one click." },
            { type: 'UI/UX', description: "Improved mobile legibility for the Debt summary card." },
        ]
    },
    {
        version: "1.7.0",
        date: "Feb 01, 2026",
        changes: [
            { type: 'Feature', description: "Introduced 'Debts & Dues' tracking with person-based grouping and balance settlement logic." },
            { type: 'UI/UX', description: "Added a 'More' expandable menu to the mobile navigation bar for better feature discovery." },
            { type: 'Logic', description: "Improved data validation for large-scale transaction bulk deletions." },
        ]
    },
    {
        version: "1.6.5",
        date: "Jan 25, 2026",
        changes: [
            { type: 'UI/UX', description: "Added 'Linked' badges to assets that are automatically synced from bank accounts." },
            { type: 'Fix', description: "Fixed a layout shift issue in the Assets grid on ultra-wide screens." },
        ]
    },
    {
        version: "1.6.0",
        date: "Jan 20, 2026",
        changes: [
            { type: 'Feature', description: "Launched 'Asset Management' dashboard to track Net Worth, Mutual Funds, and Equity." },
            { type: 'Logic', description: "Integrated real-time Bank balance syncing with the Assets portfolio view." },
            { type: 'UI/UX', description: "Implemented 'Compact View' mode for transaction lists to improve data density." },
        ]
    },
    {
        version: "1.5.5",
        date: "Jan 15, 2026",
        changes: [
            { type: 'Logic', description: "Added real-time progress indicators for the JSON Backup and Restore utility." },
            { type: 'Security', description: "Implemented password re-authentication for high-risk data management actions." },
        ]
    },
    {
        version: "1.5.0",
        date: "Jan 10, 2026",
        changes: [
            { type: 'Feature', description: "Enhanced Excel Importer with intelligent account mapping and category auto-matching." },
            { type: 'Feature', description: "Added 'Backup & Restore' utility for full data portability via encrypted JSON files." },
            { type: 'UI/UX', description: "Standardized system-wide icons using a centralized high-performance renderer." },
        ]
    },
    {
        version: "1.4.5",
        date: "Jan 05, 2026",
        changes: [
            { type: 'Logic', description: "Fine-tuned Genkit prompts for more accurate category and tag suggestions." },
            { type: 'Fix', description: "Resolved a memory leak in the real-time Firestore listener for the Analysis page." },
        ]
    },
    {
        version: "1.4.0",
        date: "Dec 28, 2025",
        changes: [
            { type: 'Feature', description: "Integrated GenAI for spending insights and automatic transaction detail suggestions." },
            { type: 'UI/UX', description: "Redesigned Dashboard stats with comparative month-over-month trend analysis." },
            { type: 'Feature', description: "Implemented 'Analysis' view with spending by tag, category, and cash flow trends." },
        ]
    },
    {
        version: "1.3.5",
        date: "Dec 20, 2025",
        changes: [
            { type: 'UI/UX', description: "Polished the 'Premium Fintech' theme with refined HSL variables for better contrast." },
            { type: 'Fix', description: "Fixed an issue where the PWA install prompt wouldn't trigger on some Android devices." },
        ]
    },
    {
        version: "1.3.0",
        date: "Dec 15, 2025",
        changes: [
            { type: 'Feature', description: "Added 'Transaction Field Customization' to allow users to reorder and hide form fields." },
            { type: 'Logic', description: "Implemented dual-mode transaction grouping (Daily vs. Monthly) based on user preference." },
            { type: 'UI/UX', description: "Introduced the 'Fintech' premium theme with soft beige backgrounds and navy typography." },
        ]
    },
    {
        version: "1.3.5",
        date: "Dec 05, 2025",
        changes: [
            { type: 'Logic', description: "Optimized chart rendering by pre-aggregating Firestore data chunks." },
            { type: 'UI/UX', description: "Added 'Chat' theme for a more conversational and lightweight user experience." },
        ]
    },
    {
        version: "1.2.0",
        date: "Nov 30, 2025",
        changes: [
            { type: 'Feature', description: "Launched multi-account support with specialized logic for Credit Card limits and utilization." },
            { type: 'Security', description: "Implemented robust Firebase Security Rules to ensure owner-only data access." },
            { type: 'UI/UX', description: "Added 'Dark Mode' support and dynamic color coding for transaction categories." },
        ]
    },
    {
        version: "1.1.5",
        date: "Nov 22, 2025",
        changes: [
            { type: 'Feature', description: "Added Phone OTP authentication as a primary sign-in alternative." },
            { type: 'Fix', description: "Fixed recurring layout shifts in the profile avatar uploader." },
        ]
    },
    {
        version: "1.1.0",
        date: "Nov 15, 2025",
        changes: [
            { type: 'Feature', description: "Initial release of core Expense & Income tracking engine." },
            { type: 'Feature', description: "Implemented Firebase Auth integration with Email and Phone OTP support." },
            { type: 'UI/UX', description: "Designed the foundation responsive layout and basic financial summary cards." },
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
                description="Our journey from 1.1.0 to the latest improvements."
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
