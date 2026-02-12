'use client';

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import pkg from '../../../../package.json';
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
        version: "1.8.1",
        date: "Feb 15, 2026",
        changes: [
            { type: 'UI/UX', description: "Refined 'Add Asset' form with premium floating labels and smart amount fallback logic." },
            { type: 'Feature', description: "Quantity and amount fields in Asset tracking are now optional for quicker entry." },
            { type: 'UI/UX', description: "Enforced centered dialog popup for Asset entry for a consistent premium feel." },
            { type: 'Fix', description: "Standardized package version imports across the application to resolve build errors." },
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
            { type: 'Fix', description: "Standardized mandatory field markers (*) across all primary input forms." },
        ]
    },
    {
        version: "1.7.9",
        date: "Feb 01, 2026",
        changes: [
            { type: 'Feature', description: "Implemented auto-calculation for credit card due dates (set to 15 days after statement date if left empty)." },
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
            { type: 'Fix', description: "Resolved a critical build error caused by an incorrect stylesheet import path." },
        ]
    },
    {
        version: "1.7.6",
        date: "Jan 02, 2026",
        changes: [
            { type: 'Feature', description: "Added a 'Getting Started' guide to the new-user screen to introduce core features." },
            { type: 'Feature', description: "Introduced a subtle 'Add to Home Screen' prompt for new users to improve app accessibility." },
            { type: 'UI/UX', description: "Implemented one-time callouts (coach marks) to highlight key actions for new users without being intrusive." },
            { type: 'Fix', description: "Increased server action timeout to resolve errors when uploading large files to Google Drive." },
            { type: 'Fix', description: "Resolved a 'controlled vs. uncontrolled input' error in forms to improve stability." },
            { type: 'Fix', description: "Set the correct app name for iOS devices to ensure 'ExpenseWise' appears in Screen Time and on the Home Screen." },
        ]
    },
    {
        version: "1.7.5",
        date: "Jan 02, 2026",
        changes: [
            { type: 'UI/UX', description: "Refined the Accounts page with improved alignment and spacing for credit card details, creating a cleaner look." },
            { type: 'UI/UX', description: "Added a subtle shadow to the 'Credit Cards' header for a modern, floating effect." },
            { type: 'Fix', description: "Resolved an issue where the main application header would disappear on some pages." },
            { type: 'Fix', description: "Corrected a layout bug that created a gap between the header and page content." },
            { type: 'UI/UX', description: "Simplified the 'Savings & Others' card by removing the total balance from the header for a cleaner look." },
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
            { type: 'UI/UX', description: "Increased the size of the main icons in the bottom navigation bar for improved visibility and easier tapping." },
            { type: 'Fix', description: "Shortened the description on the 'Spending by Category' card on the Analysis page to be more concise." },
        ]
    },
    {
        version: "1.7.3",
        date: "Jan 01, 2026",
        changes: [
            { type: 'UI/UX', description: "Improved bulk editing on Category and Tag pages with an intuitive 'selection mode' and a sticky actions header." },
            { type: 'Feature', description: "Added a 'Restore from Backup' option to the welcome card for new users, making it easier to get started." },
            { type: 'Feature', description: "Expanded the default list of categories for new users to include more common options." },
            { type: 'DevEx', description: "Added a 'dev' badge to the logo and a reload button in the header, exclusively for the development environment." },
            { type: 'Fix', description: "Corrected an issue where payment reminders were shown for credit cards that were already paid off." },
            { type: 'Fix', description: "Fixed a bug in the restore process by correctly parsing date/time values from backup files and added a timestamp to backup filenames for better organization." },
            { type: 'Fix', description: "Resolved a build error caused by an incorrect import path for the theme toggle component." },
        ]
    },
    {
        version: "1.7.2",
        date: "Dec 31, 2025",
        changes: [
            { type: 'UI/UX', description: "Polished the mobile bottom navigation with a more transparent and refined design for a modern look and feel." },
            { type: 'UI/UX', description: "Adjusted the Floating Action Button (FAB) size and positioning for better ergonomics and a more premium aesthetic." },
            { type: 'UI/UX', description: "Improved the visual hierarchy of the expandable 'More' menu on mobile, creating a cleaner, stacked-pill layout." },
            { type: 'Fix', description: "Corrected minor alignment issues in the secondary mobile navigation row to ensure perfect spacing." },
        ]
    },
    {
        version: "1.7.1",
        date: "Dec 31, 2025",
        changes: [
            { type: 'UI/UX', description: "Redesigned the 'Add Asset' form with floating labels to match the style of other prowess in the application." },
            { type: 'UI/UX', description: "Improved user feedback by ensuring both 'Save' and 'Save and New' buttons show a loading animation during transaction submission." },
            { type: 'UI/UX', description: "Made the main application header static for consistent visibility while scrolling." },
            { type: 'UI/UX', description: "Added a clear button next to the tag filter on the Analysis page to easily deselect all tags." },
            { type: 'Fix', description: "Disabled the long-press context menu on mobile navigation to provide a more app-like experience." },
            { type: 'Fix', description: "Resolved a build error in the 'Add Asset' form caused by a missing component import." },
            { type: 'Fix', description: "Corrected the Google Drive export to open the file link in the same tab instead of a new one." },
        ]
    },
    {
        version: "1.7.0",
        date: "Dec 31, 2025",
        changes: [
            { type: 'Feature', description: "Introduced a new 'Assets' page to track financial holdings like stocks and mutual funds." },
            { type: 'Feature', description: "Introduced a 'Recurring' feature to automate tracking for subscriptions and regular bills." },
            { type: 'Feature', description: "Added a new page to manage all recurring income and expenses." },
        ]
    },
    {
        version: "1.6.9",
        date: "Dec 30, 2025",
        changes: [
            { type: 'Fix', description: "Resolved all Firestore permission errors by simplifying security rules for development." },
            { type: 'Feature', description: "Implemented a scalable system for preset avatars by moving them to a JSON configuration file, simplifying future updates." },
            { type: 'UI/UX', description: "Improved the styling of the user profile dropdown menu for a cleaner, more polished appearance." },
            { type: 'UI/UX', description: "Adjusted the height of dashboard charts to be more dynamic, reducing unnecessary white space." },
            { type: 'Fix', description: "Corrected the 'Spending by Tag' chart calculation to ensure the full transaction amount is applied to each tag." },
            { type: 'Fix', description: "Resolved a ReferenceError in the dashboard's data generation function to prevent chart failures." },
        ]
    },
    {
        version: "1.6.8",
        date: "Dec 30, 2025",
        changes: [
            { type: 'Feature', description: "Added a tag filter to the Expense Analysis page for more granular expense tracking." },
            { type: 'UI/UX', description: "Unified and improved the application's loading animations for a more consistent and dynamic user experience." },
            { type: 'Feature', description: "Redesigned the 'More' menu on mobile with a cleaner, more modern sheet-style layout for easier navigation." },
            { type: 'UI/UX', description: "Streamlined the mobile bottom navigation by focusing on primary actions and moving secondary links to the 'More' sheet." },
            { type: 'Fix', description: "Ensured PWA app icons update correctly on users' home screens by versioning the manifest file." },
            { type: 'Fix', description: "Resolved a critical build error caused by an invalid import path in the main app layout." },
        ]
    },
    {
        version: "1.6.7",
        date: "Dec 29, 2025",
        changes: [
            { type: 'Fix', description: "Resolved numerous critical build failures by completely removing all code, types, and routes related to the deprecated 'Shared Expenses' feature." },
            { type: 'Fix', description: "Corrected invalid component import paths across multiple files to ensure module resolution." },
            { type: 'Fix', description: "Fixed a syntax error in a try/catch block that was causing the build to fail." },
            { type: 'Fix', description: "Resolved a TypeScript type error in chart components by ensuring functions always return a valid JSX element." },
        ]
    },
    {
        version: "1.6.6",
        date: "Dec 28, 2025",
        changes: [
            { type: 'UI/UX', description: "Updated the application logo and Progressive Web App (PWA) icons for a consistent brand identity." },
            { type: 'UI/UX', description: "Set 'Fintech' as the default theme, providing a modern and professional look out-of-the-box." },
            { type: 'UI/UX', description: "Improved the 'Add Debt' form with clearer 'You Gave'/'You Got' labels and a bolder amount field." },
            { type: 'Fix', description: "Fixed an issue causing all category and tag badges to appear in the same color when using Fintech themes." },
            { type: 'Fix', description: "Resolved an issue on mobile devices where users had to log in again after closing the PWA." },
            { type: 'Fix', description: "Corrected hardcoded colors on the 'Debts & Dues' page to respect the current theme." },
        ]
    },
    {
        version: "1.6.5",
        date: "Dec 28, 2025",
        changes: [
            { type: 'UI/UX', description: "Redesigned the 'Expenses Overview' chart with a cleaner look, focusing on the top 7 categories and grouping the rest into a new clickable 'Others' category." },
            { type: 'UI/UX', description: "Replaced the legend with a detailed, scrollable vertical list showing amounts and percentages." },
            { type: 'Fix', description: "Corrected layout issues where the category list on the dashboard did not fill its available space." },
            { type: 'UI/UX', description: "Improved the app-wide loading experience with more dynamic graphics and friendlier messages." },
            { type: 'Fix', description: "Adjusted chart tooltips to prevent them from obscuring the data when hovering." },
        ]
    },
    {
        version: "1.6.4",
        date: "Dec 23, 2025",
        changes: [
            { type: 'Feature', description: "Added a 'Pay Bill' option to credit card menus to easily settle outstanding balances from a bank account." },
            { type: 'Feature', description: "Temporarily removed the 'Shared Expenses' feature to improve application stability and simplify the user experience." },
            { type: 'Fix', description: "Resolved multiple Firestore errors, including a bug when updating only a credit card's billing date." },
            { type: 'UI/UX', description: "Improved error messages throughout the app to be more user-friendly instead of showing technical details." },
            { type: 'UI/UX', description: "Corrected icons and descriptions on the 'Debts & Dues' page for better clarity on lent vs. borrowed money." },
        ]
    },
    {
        version: "1.6.3",
        date: "Dec 19, 2025",
        changes: [
            { type: 'Feature', description: "Enabled Google Drive backup for exporting expense reports." },
            { type: 'Fix', description: "Resolved a persistent build error related to the 'react-google-drive-picker' library." },
            { type: 'Fix', description: "Removed a non-functional 'Connect with Google' button from the settings page to prevent authorization errors." },
        ]
    },
    {
        version: "1.6.2",
        date: "Dec 18, 2025",
        changes: [
            { type: 'UI', description: "Adjusted transaction filter controls to prevent wrapping on mobile for a cleaner single-line layout." },
            { type: 'UI', description: "Increased the size and added a border to the 'Clear Filters' button for better visibility and easier tapping on mobile." },
            { type: 'Fix', description: "Corrected an issue where the 'Scroll to Top/Bottom' buttons were not visible on mobile devices in the transaction list." },
        ]
    },
    {
        version: "1.6.1",
        date: "Dec 17, 2025",
        changes: [
            { type: 'UI', description: "Made the 'Add Debt' form consistent with the transaction form by using floating labels and moving the date field to the top." },
            { type: 'UI', description: "Clarified labels in the debt form to 'You are giving money'/'You are receiving money' and in the list to 'Given'/'Received' for better clarity." },
            { type: 'Feature', description: "Consolidated transaction list and form settings into a single, convenient 'Transaction Settings' section in the user profile menu." },
            { type: 'UI', description: "Disabled text selection on mobile devices to provide a more app-like feel." },
            { type: 'Fix', description: "Resolved a build error in the 'Add Asset' form caused by a missing component import." },
            { type: 'Fix', description: "Corrected the Google Drive export to open the file link in the same tab instead of a new one." },
        ]
    },
    {
        version: "1.1.0",
        date: "Oct 17, 2025",
        changes: [
            { type: 'Feature', description: "Initial release of ExpenseWise." },
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
        default:
            return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
};

export default function AboutPage() {
    // Only expand the latest version by default for cleaner hierarchy
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
                            {/* Timeline Dot */}
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
