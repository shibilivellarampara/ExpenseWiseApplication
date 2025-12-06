
'use client';

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const appVersion = "1.4.8";


const changelog = [
    {
        version: "1.4.8",
        date: "2025-12-14",
        changes: [
            { type: 'UI', description: "Improved the 'Spending by Tag' and 'Income Sources' pie charts on the Analysis page to group smaller items into an 'Others' category for a cleaner look, while still providing a full, scrollable list of all items below." },
            { type: 'Feature', description: "Added a convenient 'All Accounts' option to the account filter on the Analysis page." },
            { type: 'UI', description: "Made the 'Spending by Category' card on the Analysis page collapsible to save space." },
            { type: 'Fix', description: "Corrected number formatting in the 'Income vs. Expense Trend' chart to always show two decimal places." },
            { type: 'UI', description: "Removed the redundant description from the 'Spending by Category' card." },
        ]
    },
    {
        version: "1.4.7",
        date: "2025-12-12",
        changes: [
            { type: 'Fix', description: "Resolved a persistent build failure by upgrading Next.js to the latest patched version to address a critical security vulnerability." },
            { type: 'Fix', description: "Corrected a visual bug where fully paid or overpaid credit cards were not correctly marked as 'Paid'." },
            { type: 'UI', description: "Improved the Accounts page by ensuring bank accounts are listed first and preventing card icons from triggering navigation." },
        ]
    },
    {
        version: "1.4.6",
        date: "2025-12-10",
        changes: [
            { type: 'Feature', description: "Added visibility toggles in Analysis Settings to show or hide individual charts and the AI insights card on the Analysis page." },
        ]
    },
    {
        version: "1.4.5",
        date: "2025-12-09",
        changes: [
            { type: 'UI', description: "Streamlined the Settings page by combining 'Profile' and 'Security' sections and moving the 'Danger Zone' to the bottom for safety." },
            { type: 'UI', description: "Set 'Profile Details' and 'Form Customization' sections in Settings to be collapsed by default." },
            { type: 'Feature', description: "Added 'Cash In'/'Cash Out' buttons to the monthly transaction summary page for quicker access." },
            { type: 'Feature', description: "Added a 'Go to Analysis' link in the account menu to directly view analysis filtered for that account." },
            { type: 'Feature', description: "Added new icons for 'Grocery' and 'Fuel' and many other categories to provide more visual customization." },
            { type: 'Fix', description: "The Analysis page now defaults to the 'Last 3 Months' view instead of 'This Month'." },
            { type: 'Fix', description: "Resolved a bug where AI suggestions were not being disabled correctly in the transaction form." },
        ]
    },
    {
        version: "1.4.4",
        date: "2025-12-08",
        changes: [
            { type: 'Fix', description: "Corrected the logic for 'Credit Card Payment' transactions to allow them to be recorded as an expense from non-credit card accounts (e.g., a bank account)." },
        ]
    },
    {
        version: "1.4.3",
        date: "2025-12-06",
        changes: [
            { type: 'Fix', description: "Resolved all persistent Firestore security rule errors that were preventing data from being displayed on several pages. The rules have been completely overhauled for correctness and stability." },
        ]
    },
    {
        version: "1.4.2",
        date: "2025-12-05",
        changes: [
            { type: 'Fix', description: "Resolved persistent build errors by removing a problematic and unused account settings component." },
            { type: 'Fix', description: "Corrected internal component import paths to improve application stability." },
        ]
    },
    {
        version: "1.4.1",
        date: "2025-12-03",
        changes: [
            { type: 'Feature', description: "Added a secure way to store and view non-sensitive credit card details (nickname, last 4 digits, etc.) to easily identify cards." },
            { type: 'UI', description: "Made credit card icons on the Accounts page clickable to directly open the new card details view." },
            { type: 'Feature', description: "Enhanced the Excel importer to automatically match and map accounts from your file to existing accounts in the app, with the option to override." },
        ]
    },
    {
        version: "1.4.0",
        date: "2025-11-30",
        changes: [
            { type: 'Feature', description: "Made account names in the transaction list clickable to automatically filter by that account." },
            { type: 'Feature', description: "Enhanced the 'Save and New' button to retain both the Date and Account from the previous transaction." },
            { type: 'Feature', description: "Moved the 'Merge' button in Category and Tag settings to be more intuitive and accessible next to the selection checkboxes." },
            { type: 'UI', description: "Replaced the 'Settle Debt' checkmark icon with a more descriptive 'Handshake' icon." },
            { type: 'Fix', description: "Resolved a timezone bug that could cause date/time entries to be saved on the previous day." },
        ]
    },
    {
        version: "1.3.10",
        date: "2025-11-28",
        changes: [
            { type: 'Feature', description: "Added the ability to delete a person and all their associated records from the Debts & Dues page." },
            { type: 'Fix', description: "The 'Save and New' button in the transaction form now retains the date from the previous entry to make back-dating easier." },
        ]
    },
    {
        version: "1.3.9",
        date: "2025-11-26",
        changes: [
            { type: 'Feature', description: "Grouped debts by person on the Debts & Dues page for a clearer overview." },
            { type: 'Feature', description: "Added a quick-add button to create new transactions for existing people on the Debts page." },
            { type: 'Fix', description: "Corrected the net amount calculation to only include 'pending' debts." },
            { type: 'Fix', description: "Removed the 'Settle Debt' success notification for a quieter experience." },
            { type: 'Fix', description: "Removed default '0.00' values from amount fields in forms." },
        ]
    },
    {
        version: "1.3.8",
        date: "2025-11-24",
        changes: [
            { type: 'Feature', description: "Added a new 'Debts & Dues' page to track lent and borrowed money." },
            { type: 'Feature', description: "Added the ability to mark debts as 'settled'." },
            { type: 'Fix', description: "Resolved a build error caused by an incorrect component import for the DateTimePicker." },
        ]
    },
    {
        version: "1.3.7",
        date: "2025-11-22",
        changes: [
            { type: 'Fix', description: "Addressed various build errors and permission issues to improve application stability." },
            { type: 'Feature', description: "Added a dedicated popup for credit card payment history on the Accounts page." },
        ]
    },
    {
        version: "1.3.6",
        date: "2025-11-20",
        changes: [
            { type: 'Feature', description: "Added a progress bar to the report generation feature for better user feedback." },
            { type: 'Feature', description: "Added 'Last 6 Months' and 'Last Year' options to the date range filter on the Analysis page." },
            { type: 'Feature', description: "Added a setting to specify a default account for new transactions in Form Customization." },
            { type: 'Feature', description: "Added visibility toggles to show or hide fields in the transaction form via Form Customization." },
            { type: 'Fix', description: "Corrected the credit card progress bar to accurately show available credit to the total limit." },
            { type: 'Fix', description: "Resolved UI layout bugs that caused inconsistent scrolling and button behavior." },
            { type: 'Fix', description: "Fixed a runtime error that prevented the 'Create new tag' dialog from opening in the transaction form." },
        ]
    },
    {
        version: "1.3.5",
        date: "2025-11-18",
        changes: [
            { type: 'Feature', description: "Added the ability to merge multiple categories or tags into a single new or existing item, streamlining data organization." },
            { type: 'Feature', description: "Made category and tag badges in the transaction list clickable, automatically applying a filter for that item." },
            { type: 'Feature', description: "Added a collapsible tag breakdown in the category analysis table to show spending distribution within each category." },
            { type: 'Fix', description: "Improved data import logic to correctly normalize and merge similar category/tag names (e.g., 'cashback' and 'Cash Back')." },
        ]
    },
    {
        version: "1.3.4",
        date: "2025-11-16",
        changes: [
            { type: 'Fix', description: "Corrected an issue where special financial categories like 'Credit Card Payment' were always excluded from analysis, regardless of user settings." },
            { type: 'Fix', description: "Resolved a build error caused by an incorrect import path for `AnalysisSettingsContent`." },
            { type: 'Feature', description: "Added a toggle in Analysis Settings to show or hide the 'Normal Total' summary card." },
        ]
    },
    {
        version: "1.3.3",
        date: "2025-11-14",
        changes: [
            { type: 'Fix', description: "Resolved a layout issue in the category analysis table that caused a runtime error when expanding rows." },
            { type: 'Fix', description: "Corrected the alignment of the notification panel to ensure it appears centered below the bell icon." },
        ]
    },
    {
        version: "1.3.2",
        date: "2025-11-12",
        changes: [
            { type: 'Feature', description: "Added a notification center to the header to provide timely alerts for events like upcoming credit card payments." },
            { type: 'Feature', description: "Added a 'Compact View' option in the Profile settings to allow for a denser transaction list." },
            { type: 'Fix', description: "Streamlined the transaction page layout by removing the redundant main page header." },
            { type: 'Fix', description: "Resolved a crash on the notifications panel caused by a missing component import." },
        ]
    },
    {
        version: "1.3.1",
        date: "2025-11-10",
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
        date: "2025-11-08",
        changes: [
            { type: 'Fix', description: "Resolved a persistent Firestore query error that was incorrectly reported as 'Missing or insufficient permissions' by refactoring data fetching logic on the transactions and analysis pages." },
            { type: 'Fix', description: "Replaced the date range tabs on the analysis page with a dropdown menu to improve usability and accommodate more options, including a custom date range picker." },
            { type: 'Feature', description: "Added a multi-select dropdown to the analysis page to allow filtering by one or more financial accounts." },
            { type: 'Fix', description: "Enabled clickable rows in the 'Spending by Category' table to navigate directly to a pre-filtered list of corresponding transactions." },
        ]
    },
    {
        version: "1.2.9",
        date: "2025-11-06",
        changes: [
            { type: 'Feature', description: "Introduced a new 'Analysis' page with detailed expense breakdowns, trend charts, and AI-powered insights." },
            { type: 'Feature', description: "Added full support for income categorization, allowing for a complete financial overview on the Analysis page." },
            { type: 'Fix', description: "Resolved server errors on the Analysis page caused by improper data handling for the AI flow." },
        ]
    },
    {
        version: "1.2.8",
        date: "2025-11-04",
        changes: [
            { type: 'Feature', description: "Added a dedicated theme toggle button to the main header for easier access." },
            { type: 'Feature', description: "Streamlined report generation and added a 'Copy to Clipboard' option." },
            { type: 'Feature', description: "Added 'ExpenseWise Report' as a new template for easier data re-importing." },
            { type: 'Fix', description: "Improved consistency in the transaction form by placing 'Add new tag' at the top of its dropdown." },
            { type: 'Fix', description: "Added remove buttons to selected tags in the transaction form for quicker editing." },
        ]
    },
    {
        version: "1.2.7",
        date: "2025-11-02",
        changes: [
            { type: 'Feature', description: "Added a 'Credit Limit Downgrade' category to reduce a credit card's limit via an expense transaction." },
        ]
    },
    {
        version: "1.2.6",
        date: "2025-10-31",
        changes: [
            { type: 'Feature', description: "Added a 'Payment History' option to credit card menus for quick access to payment transactions." },
        ]
    },
    {
        version: "1.2.5",
        date: "2025-10-29",
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
        date: "2025-10-27",
        changes: [
            { type: 'Feature', description: "Optimized transaction list performance by implementing list virtualization for large datasets." },
        ]
    },
    {
        version: "1.2.3",
        date: "2025-10-25",
        changes: [
            { type: 'Fix', description: "Resolved multiple TypeScript type errors that were causing persistent build failures." },
            { type: 'Fix', description: "Corrected data handling in login, sign-up, and transaction forms to improve type safety." },
        ]
    },
    {
        version: "1.2.2",
        date: "2025-10-23",
        changes: [
            { type: 'Feature', description: "Added search functionality to the transactions page to filter by description and amount." },
            { type: 'Fix', description: "Changed the search input placeholder to be more concise." },
        ]
    },
    {
        version: "1.2.1",
        date: "2025-10-21",
        changes: [
            { type: 'Feature', description: "Implemented a true running balance calculation for all transactions, visible on the main list without requiring filtering." },
            { type: 'Fix', description: "Corrected bank account running balance to calculate forward from a starting balance of zero for the filtered period." },
        ]
    },
    {
        version: "1.2.0",
        date: "2025-10-19",
        changes: [
            { type: 'Feature', description: "Added 'Select All' checkbox to the Excel importer for easier account selection." },
            { type: 'Fix', description: "Updated 'Clear All Data' function to correctly delete accounts in addition to transactions." },
        ]
    },
    {
        version: "1.1.0",
        date: "2025-10-17",
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
                                        <Badge variant={change.type === 'Feature' || change.type === 'UI' ? 'default' : 'secondary'}>
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

    