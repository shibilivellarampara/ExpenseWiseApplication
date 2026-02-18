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
            { type: 'UI/UX', description: "Integrated Tag icons and corrected alignment in the nested category breakdown." },
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
        date: "Feb 18, 2026",
        changes: [
            { type: 'UI/UX', description: "Finalized premium fintech redesign for Accounts, Debts, and Assets with elevated summary cards and unified search headers." },
            { type: 'UI/UX', description: "Implemented themed fade-out effects for all progress bars, enhancing visual clarity for credit utilization." },
            { type: 'UI/UX', description: "Contextualized filter cancellation in the Debts UI by moving clear buttons inside respective stat boxes." },
            { type: 'Feature', description: "Stabilized the 'Recurring Transactions' module by resolving invalid Firebase document references and segment mismatches." },
            { type: 'Logic', description: "Standardized v1.8.3 features across production and workspace environments for global parity." },
        ]
    },
    {
        version: "1.8.2",
        date: "Feb 18, 2026",
        changes: [
            { type: 'Feature', description: "Dashboard 'Total Monthly Expense' now automatically excludes the 'Transfer' category for more accurate spending tracking." },
            { type: 'Feature', description: "Optimized transaction list rendering by removing internal scroll constraints for a more natural feel consistent with other pages." },
            { type: 'Feature', description: "Refined Bottom Navigation positioning with a 16px offset for improved cross-platform mobile accessibility." },
            { type: 'UI/UX', description: "Standardized transaction form button text to 14px and enforced primary theme styling on hover." },
            { type: 'Fix', description: "Resolved critical JSX tag mismatch and syntax errors in forms and dashboard stats." },
        ]
    },
    {
        version: "1.8.1",
        date: "Feb 16, 2026",
        changes: [
            { type: 'Feature', description: "Enforced centered dialog popup for Asset entry across all devices for a consistent premium feel." },
            { type: 'Feature', description: "Standardized 'Add Asset' form with high-quality floating labels and smart invested/current amount fallback logic." },
            { type: 'Feature', description: "Improved 'Add Asset' form flexibility: Quantity, Invested Amount, and Current Value are now optional." },
            { type: 'UI/UX', description: "Added refined 'click knowing' interaction to account names with theme-aware oval backgrounds." },
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
            { type: 'Fix', description: "Resolved a validation issue in the account form where empty optional numeric fields caused submission failures." },
        ]
    },
    {
        version: "1.7.9",
        date: "Feb 01, 2026",
        changes: [
            { type: 'Fix', description: "Resolved a persistent issue with form submission in the 'Add Account' view where hidden fields caused validation failures." },
            { type: 'UI/UX', description: "Implemented a more robust context-driven field order for the 'Add Account' form with floating labels." },
            { type: 'UI/UX', description: "Improved form responsiveness and loading states for a smoother entry experience." },
        ]
    },
    {
        version: "1.7.8",
        date: "Jan 31, 2026",
        changes: [
            { type: 'Fix', description: "Resolved a critical build failure caused by incorrect component import paths on the 'Debts & Dues' page." },
            { type: 'UI/UX', description: "Clarified the 'Net Position' label on the Debts summary to dynamically show 'Net Owed' or 'You Owe'." },
            { type: 'UI/UX', description: "Made the Debts summary card more compact for a cleaner look." },
        ]
    },
    {
        version: "1.7.7",
        date: "Jan 11, 2026",
        changes: [
            { type: 'Feature', description: "Added robust filtering and sorting options to the 'Debts & Dues' page." },
            { type: 'UI/UX', description: "Consolidated debt filters into a single, clean row of dropdowns for a better user experience." },
            { type: 'UI/UX', description: "Disabled text selection across the app to provide a more native, app-like feel." },
            { type: 'UI/UX', description: "Shortened the 'Accounts' filter label on the Analysis page to 'Acct' for a more concise layout." },
        ]
    },
    {
        version: "1.7.6",
        date: "Jan 02, 2026",
        changes: [
            { type: 'Feature', description: "Added a 'Getting Started' guide to the new-user screen to introduce core features." },
            { type: 'Feature', description: "Introduced a subtle 'Add to Home Screen' prompt for new users to improve app accessibility." },
            { type: 'UI/UX', description: "Implemented one-time callouts (coach marks) to highlight key actions for new users." },
            { type: 'Fix', description: "Increased server action timeout to resolve errors when uploading large files to Google Drive." },
        ]
    },
    {
        version: "1.7.5",
        date: "Jan 02, 2026",
        changes: [
            { type: 'UI/UX', description: "Refined the Accounts page with improved alignment and spacing for credit card details." },
            { type: 'UI/UX', description: "Added a subtle shadow to the 'Credit Cards' header for a modern, floating effect." },
            { type: 'Fix', description: "Resolved an issue where the main application header would disappear on some pages." },
            { type: 'UI/UX', description: "Improved clarity on the Accounts page by showing 'Due' for cards with a balance and 'Next bill' for paid cards." },
        ]
    },
    {
        version: "1.7.4",
        date: "Jan 02, 2026",
        changes: [
            { type: 'Feature', description: "Added a 'Monthly Savings Trend' chart to the Analysis page to visualize net savings over time." },
            { type: 'UI/UX', description: "Made all chart and insight cards on the Analysis page collapsible for a cleaner, more customizable view." },
            { type: 'UI/UX', description: "Added text labels to the secondary navigation menu (the 'More' pop-up) on mobile for better clarity." },
            { type: 'UI/UX', description: "Increased the size of the icons in the bottom navigation bar for improved visibility." },
        ]
    },
    {
        version: "1.7.3",
        date: "Jan 01, 2026",
        changes: [
            { type: 'UI/UX', description: "Improved bulk editing on Category and Tag pages with an intuitive 'selection mode' and a sticky actions header." },
            { type: 'Feature', description: "Added a 'Restore from Backup' option to the welcome card for new users." },
            { type: 'Feature', description: "Expanded the default list of categories for new users to include more common options." },
            { type: 'DevEx', description: "Added a 'dev' badge to the logo and a reload button in the header for the development environment." },
        ]
    },
    {
        version: "1.7.2",
        date: "Dec 31, 2025",
        changes: [
            { type: 'UI/UX', description: "Polished the mobile bottom navigation with a more transparent and refined design." },
            { type: 'UI/UX', description: "Adjusted the Floating Action Button (FAB) size and positioning for better ergonomics." },
            { type: 'UI/UX', description: "Improved the visual hierarchy of the expandable 'More' menu on mobile." },
        ]
    },
    {
        version: "1.7.1",
        date: "Dec 31, 2025",
        changes: [
            { type: 'UI/UX', description: "Redesigned the 'Add Asset' form with floating labels to match the application's premium aesthetic." },
            { type: 'UI/UX', description: "Improved user feedback by ensuring loading animations during transaction submission." },
            { type: 'UI/UX', description: "Made the main application header static for consistent visibility while scrolling." },
        ]
    },
    {
        version: "1.7.0",
        date: "Dec 31, 2025",
        changes: [
            { type: 'Feature', description: "Introduced a new 'Assets' page to track financial holdings like stocks and mutual funds." },
            { type: 'Feature', description: "Introduced a 'Recurring' feature to automate tracking for subscriptions and regular bills." },
        ]
    },
    {
        version: "1.6.9",
        date: "Dec 30, 2025",
        changes: [
            { type: 'Fix', description: "Resolved all Firestore permission errors by simplifying security rules for development." },
            { type: 'Feature', description: "Implemented a scalable system for preset avatars by moving them to a JSON configuration." },
            { type: 'UI/UX', description: "Improved the styling of the user profile dropdown menu." },
        ]
    },
    {
        version: "1.6.8",
        date: "Dec 30, 2025",
        changes: [
            { type: 'Feature', description: "Added a tag filter to the Expense Analysis page for more granular expense tracking." },
            { type: 'UI/UX', description: "Unified and improved the application's loading animations." },
            { type: 'Feature', description: "Redesigned the 'More' menu on mobile with a cleaner, more modern sheet-style layout." },
        ]
    },
    {
        version: "1.6.7",
        date: "Dec 29, 2025",
        changes: [
            { type: 'Fix', description: "Resolved critical build failures by removing deprecated 'Shared Expenses' features." },
            { type: 'Fix', description: "Corrected invalid component import paths across multiple files." },
        ]
    },
    {
        version: "1.6.6",
        date: "Dec 28, 2025",
        changes: [
            { type: 'UI/UX', description: "Updated the application logo and Progressive Web App (PWA) icons." },
            { type: 'UI/UX', description: "Set 'Fintech' as the default theme, providing a modern and professional look." },
            { type: 'UI/UX', description: "Improved the 'Add Debt' form with clearer labels and a bolder amount field." },
        ]
    },
    {
        version: "1.6.5",
        date: "Dec 28, 2025",
        changes: [
            { type: 'UI/UX', description: "Redesigned the 'Expenses Overview' chart with a cleaner look and 'Others' category grouping." },
            { type: 'UI/UX', description: "Replaced the legend with a detailed, scrollable vertical list showing amounts and percentages." },
        ]
    },
    {
        version: "1.6.4",
        date: "Dec 23, 2025",
        changes: [
            { type: 'Feature', description: "Added a 'Pay Bill' option to credit card menus to settle balances from a bank account." },
            { type: 'Fix', description: "Resolved multiple Firestore errors related to credit card billing date updates." },
        ]
    },
    {
        version: "1.6.3",
        date: "Dec 19, 2025",
        changes: [
            { type: 'Feature', description: "Enabled Google Drive backup for exporting expense reports." },
            { type: 'Fix', description: "Resolved a persistent build error related to the Google Drive picker integration." },
        ]
    },
    {
        version: "1.6.2",
        date: "Dec 18, 2025",
        changes: [
            { type: 'UI/UX', description: "Adjusted transaction filter controls to prevent wrapping on mobile." },
            { type: 'UI/UX', description: "Enhanced visibility and accessibility of 'Clear Filters' buttons on mobile." },
        ]
    },
    {
        version: "1.6.1",
        date: "Dec 17, 2025",
        changes: [
            { type: 'UI/UX', description: "Standardized the 'Add Debt' form with floating labels and refined layouts." },
            { type: 'Feature', description: "Consolidated transaction list and form settings into a single 'Transaction Settings' section." },
        ]
    },
    {
        version: "1.6.0",
        date: "Dec 11, 2025",
        changes: [
            { type: 'Security', description: "Upgraded Next.js to version 16.0.7 to patch a critical security vulnerability." },
        ]
    },
    {
        version: "1.5.1",
        date: "Dec 16, 2025",
        changes: [
            { type: 'Feature', description: "Added contextual page-specific settings to the user profile dropdown." },
            { type: 'Feature', description: "Enhanced Excel exports to include icons for categories and tags." },
            { type: 'Feature', description: "Implemented selective reset dialogs for safer data management." },
        ]
    },
    {
        version: "1.5.0",
        date: "Dec 15, 2025",
        changes: [
            { type: 'Feature', description: "Added the ability to archive and reactivate categories and tags." },
        ]
    },
    {
        version: "1.4.9",
        date: "Dec 14, 2025",
        changes: [
            { type: 'Fix', description: "Refined credit card payment notifications to prevent alerts for paid-off cards." },
        ]
    },
    {
        version: "1.4.8",
        date: "Dec 06, 2025",
        changes: [
            { type: 'UI/UX', description: "Improved pie chart data grouping for cleaner Analysis page visualizations." },
            { type: 'Feature', description: "Added 'All Accounts' filtering to the Analysis dashboard." },
        ]
    },
    {
        version: "1.4.7",
        date: "Dec 12, 2025",
        changes: [
            { type: 'Fix', description: "Corrected visual bugs where fully paid credit cards were not marked correctly." },
            { type: 'UI/UX', description: "Prioritized bank accounts in the accounts list for better accessibility." },
        ]
    },
    {
        version: "1.4.6",
        date: "Dec 10, 2025",
        changes: [
            { type: 'Feature', description: "Added visibility toggles for individual charts and AI insight cards." },
        ]
    },
    {
        version: "1.4.5",
        date: "Dec 09, 2025",
        changes: [
            { type: 'UI/UX', description: "Combined 'Profile' and 'Security' sections in Settings for a more efficient layout." },
            { type: 'Feature', description: "Added 'Cash In'/'Cash Out' shortcuts to the monthly transaction view." },
        ]
    },
    {
        version: "1.4.4",
        date: "Dec 08, 2025",
        changes: [
            { type: 'Fix', description: "Corrected 'Credit Card Payment' logic for cross-account transactions." },
        ]
    },
    {
        version: "1.4.3",
        date: "Dec 06, 2025",
        changes: [
            { type: 'Security', description: "Overhauled Firestore security rules for robust owner-based data access." },
        ]
    },
    {
        version: "1.4.2",
        date: "Dec 05, 2025",
        changes: [
            { type: 'Fix', description: "Resolved persistent build errors by removing unused account components." },
        ]
    },
    {
        version: "1.4.1",
        date: "Dec 03, 2025",
        changes: [
            { type: 'Feature', description: "Introduced secure non-sensitive credit card detail storage." },
            { type: 'Feature', description: "Enhanced Excel importer with intelligent account mapping." },
        ]
    },
    {
        version: "1.4.0",
        date: "Nov 30, 2025",
        changes: [
            { type: 'Feature', description: "Integrated GenAI for spending insights and automatic transaction suggestions." },
            { type: 'Feature', description: "Added 'Save and New' functionality to speed up bulk entry." },
        ]
    },
    {
        version: "1.3.10",
        date: "Nov 28, 2025",
        changes: [
            { type: 'Feature', description: "Added bulk deletion capabilities for debts and dues." },
        ]
    },
    {
        version: "1.3.9",
        date: "Nov 26, 2025",
        changes: [
            { type: 'Feature', description: "Introduced person-based grouping for Debt tracking." },
        ]
    },
    {
        version: "1.3.8",
        date: "Nov 24, 2025",
        changes: [
            { type: 'Feature', description: "Launched the initial 'Debts & Dues' tracking module." },
        ]
    },
    {
        version: "1.3.0",
        date: "Nov 08, 2025",
        changes: [
            { type: 'Feature', description: "Implemented multi-account support and advanced analysis filters." },
        ]
    },
    {
        version: "1.2.0",
        date: "Oct 19, 2025",
        changes: [
            { type: 'Feature', description: "Added running balance calculations and search functionality." },
        ]
    },
    {
        version: "1.1.0",
        date: "Oct 17, 2025",
        changes: [
            { type: 'Feature', description: "Initial release of the ExpenseWise core engine." },
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
                description="The journey of ExpenseWise from 1.1.0 to the latest improvements."
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
