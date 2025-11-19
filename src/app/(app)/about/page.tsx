
'use client';

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import pkg from '../../../../package.json';
const appVersion = pkg.version;


const changelog = [
    {
        version: "1.3.4",
        date: "2024-08-16",
        changes: [
            { type: 'Feature', description: "Added the ability to merge multiple categories or tags into a single new or existing item, streamlining data organization." },
            { type: 'Feature', description: "Made category and tag badges in the transaction list clickable, automatically applying a filter for that item." },
            { type: 'Feature', description: "Added a collapsible tag breakdown in the category analysis table to show spending distribution within each category." },
        ]
    },
    {
        version: "1.3.3",
        date: "2024-08-15",
        changes: [
            { type: 'Fix', description: "Resolved a layout issue in the category analysis table that caused a runtime error when expanding rows." },
            { type: 'Fix', description: "Corrected the alignment of the notification panel to ensure it appears centered below the bell icon." },
        ]
    },
    {
        version: "1.3.2",
        date: "2024-08-14",
        changes: [
            { type: 'Feature', description: "Added a notification center to the header to provide timely alerts for events like upcoming credit card payments." },
            { type: 'Feature', description: "Added a 'Compact View' option in the Profile settings to allow for a denser transaction list." },
            { type: 'Fix', description: "Streamlined the transaction page layout by removing the redundant main page header." },
            { type: 'Fix', description: "Resolved a crash on the notifications panel caused by a missing component import." },
        ]
    },
    {
        version: "1.3.1",
        date: "2024-08-13",
        changes: [
            { type: 'Feature', description: "Added a 'Net' view to the category analysis table to show net cash flow per category." },
            { type: 'Feature', description: "Made category rows on the Analysis page clickable, opening an in-page dialog with the corresponding transactions." },
            { type: 'Feature', description: "Added 'All Time' as a date range option on the Analysis and Dashboard pages." },
            { type: 'Feature', description: "Combined 'Field Order' and 'Required Fields' into a single 'Form Customization' setting with up/down arrows for reordering." },
            { type: 'Feature', description: "Added a new 'Analysis Settings' card on the Profile page to allow users to exclude specific categories from analysis." },
            { type: 'Fix', description: "Resolved a critical build error caused by a type mismatch on the Analysis page." },
            { type: 'Fix', description: "Fixed a layout issue where floating action buttons on the Transactions page would overlap content on scroll." },
        ]
    },
    {
        version: "1.3.0",
        date: "2024-08-12",
        changes: [
            { type: 'Fix', description: "Resolved a persistent Firestore query error that was incorrectly reported as 'Missing or insufficient permissions' by refactoring data fetching logic on the transactions and analysis pages." },
            { type: 'Fix', description: "Replaced the date range tabs on the analysis page with a dropdown menu to improve usability and accommodate more options, including a custom date range picker." },
            { type: 'Feature', description: "Added a multi-select dropdown to the analysis page to allow filtering by one or more financial accounts." },
            { type: 'Fix', description: "Enabled clickable rows in the 'Spending by Category' table to navigate directly to a pre-filtered list of corresponding transactions." },
        ]
    },
    {
        version: "1.2.9",
        date: "2024-08-11",
        changes: [
            { type: 'Feature', description: "Introduced a new 'Analysis' page with detailed expense breakdowns, trend charts, and AI-powered insights." },
            { type: 'Feature', description: "Added full support for income categorization, allowing for a complete financial overview on the Analysis page." },
            { type: 'Fix', description: "Resolved server errors on the Analysis page caused by improper data handling for the AI flow." },
        ]
    },
    {
        version: "1.2.8",
        date: "2024-08-10",
        changes: [
            { type: 'Feature', description: "Added a dedicated theme toggle button to the main header for easier access." },
            { type Putin: 'Feature', description: "Streamlined report generation and added a 'Copy to Clipboard' option." },
            { type: 'Feature', description: "Added 'ExpenseWise Report' as a new template for easier data re-importing." },
            { type: 'Fix', description: "Improved consistency in the transaction form by placing 'Add new tag' at the top of its dropdown." },
            { type: 'Fix', description: "Added remove buttons to selected tags in the transaction form for quicker editing." },
        ]
    },
    {
        version: "1.2.7",
        date: "2024-08-09",
        changes: [
            { type: 'Feature', description: "Added a 'Credit Limit Downgrade' category to reduce a credit card's limit via an expense transaction." },
        ]
    },
    {
        version: "1.2.6",
        date: "2024-08-08",
        changes: [
            { type: 'Feature', description: "Added a 'Payment History' option to credit card menus for quick access to payment transactions." },
        ]
    },
    {
        version: "1.2.5",
        date: "2024-08-07",
        changes: [
            { type: 'Feature', description: "Unified date and time selection into a single input in the transaction form." },
            { type: 'Feature', description: "Implemented a consistent, searchable dropdown for tag selection, matching account and category fields." },
            { type: 'Fix', description: "Resolved inconsistent label behavior in the transaction form for a uniform UI." },
            { type: 'Fix', description: "Corrected a visual bug causing a 'double border' on focused form inputs." },
            { type: 'Fix', description: "Removed hardcoded currency symbols from input fields for better internationalization." },
            { type: 'Fix', description: "Ensured consistent font sizes across all elements in the transaction form." },
        ]
    },
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
