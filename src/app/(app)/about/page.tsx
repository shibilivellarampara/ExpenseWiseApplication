
'use client';

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import pkg from '@/../package.json';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const appVersion = pkg.version;

const changelog = [
    {
        version: "1.8.8",
        date: "Feb 19, 2026",
        changes: [
            { type: 'UI/UX', description: "Implemented 'Liquid Glass' design for bottom navigation and FAB, featuring backdrop-blur-2xl, inner edge highlights, and deep ambient floating shadows." },
            { type: 'UI/UX', description: "Enhanced secondary navigation transitions with liquid-scale animations and refined glassmorphic depth." },
            { type: 'UI/UX', description: "Optimized shadow layers to use theme-based primary colors instead of hardcoded blue for a truly native feel." },
            { type: 'UI/UX', description: "Enhanced vertical real estate for transactions by increasing the scrollable list height by 40%." },
            { type: 'UI/UX', description: "Optimized mobile typography for bottom navigation labels with bold uppercase tracking for maximum legibility on glass surfaces." },
        ]
    },
    {
        version: "1.8.7",
        date: "Feb 19, 2026",
        changes: [
            { type: 'UI/UX', description: "Implemented premium 'featured' foreground styling with high-density multidirectional shadows across all dashboard, analysis, and account cards." },
            { type: 'UI/UX', description: "Added intelligent multi-line label wrapping for donut charts to perfectly fit long names like 'Credit Card Payment' within the center." },
            { type: 'Logic', description: "Configured Analysis page filters (Time Range, Accounts, Tags) to automatically close upon selection for a more fluid workflow." },
            { type: 'Fix', description: "Standardized credit card due date auto-calculation to 20 days post-statement date (previously 15)." },
            { type: 'UI/UX', description: "Eliminated focus-ring and touch-highlight artifacts globally to ensure a cleaner, native app-like interaction feel." },
            { type: 'Fix', description: "Resolved shadow clipping issues on mobile by optimizing container padding and z-index stacking for elevated cards." },
        ]
    },
    {
        version: "1.8.6",
        date: "Feb 19, 2026",
        changes: [
            { type: 'UI/UX', description: "Implemented 'click knowing' active states for all card headers and account names for immediate interaction feedback." },
            { type: 'UI/UX', description: "Standardized semantic financial coloring: Primary for positive/income values and Destructive for negative/expense values across summaries." },
            { type: 'UI/UX', description: "Reduced Analysis filter dropdown widths by 25% and optimized mobile alignment for a cleaner, gap-respecting layout." },
            { type: 'Feature', description: "Set Analysis chart and insight cards to be closed by default for a more focused initial page view." },
            { type: 'UI/UX', description: "Refined Category Analysis transaction popups with high-density widths and standardized Inter typography." },
        ]
    },
    {
        version: "1.8.5",
        date: "Feb 18, 2026",
        changes: [
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
            { type: 'UI/UX', description: "Implemented responsive typography for summary cards, ensuring amounts scale gracefully on mobile devices." },
            { type: 'UI/UX', description: "Applied consistent shadow-md elevation to all dashboard cards for enhanced visual depth." },
            { type: 'Feature', description: "Aligned Asset performance visuals with semantic themes: primary for gains and destructive for losses." },
            { type: 'Fix', description: "Resolved critical ReferenceErrors for 'orderBy' and 'Badge' across various holding components." },
            { type: 'Logic', description: "Standardized v1.8.3 features across production and workspace environments for global parity." },
            { type: 'UI/UX', description: "Finalized premium fintech redesign for Accounts and Debts with elevated summary cards and unified search headers." },
            { type: 'UI/UX', description: "Implemented themed fade-out effects for all progress bars, enhancing visual clarity for credit utilization." },
            { type: 'UI/UX', description: "Contextualized filter cancellation in the Debts UI by moving clear buttons inside respective stat boxes." },
            { type: 'Feature', description: "Stabilized the 'Recurring Transactions' module by resolving invalid Firebase document references and segment mismatches." },
            { type: 'Logic', description: "Standardized v1.8.2 logic and UI refinements across production and workspace environments for global consistency." },
        ]
    },
    {
        version: "1.8.2",
        date: "Feb 18, 2026",
        changes: [
            { type: 'Feature', description: "Dashboard 'Total Monthly Expense' now automatically excludes the 'Transfer' category for more accurate spending tracking." },
            { type: 'Feature', description: "Optimized transaction list rendering by removing internal scroll constraints for a more natural natural feel consistent with other pages." },
            { type: 'Feature', description: "Refined Bottom Navigation positioning with a 16px offset for improved cross-platform mobile accessibility and floating aesthetic." },
            { type: 'UI/UX', description: "Standardized transaction form button text to 14px and enforced primary theme styling on hover for consistency." },
            { type: 'Fix', description: "Resolved critical JSX tag mismatch and syntax errors in forms and dashboard stats to ensure production stability." },
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
            { type: 'Fix', description: "Resolved account list sorting logic bug preventing successful compilation." },
        ]
    },
    {
        version: "1.8.0",
        date: "Feb 12, 2026",
        changes: [
            { type: 'Feature', description: "Implemented auto-calculation for credit card due dates (set to 20 days after statement date if left empty)." },
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
            { type: 'Feature', description: "Implemented auto-calculation for credit card due dates (set to 20 days after statement date if left empty)." },
            { type: 'Fix', description: "Resolved a persistent issue with form submission in the 'Add Account' view where hidden fields caused validation failures." },
            { type: 'UI/UX', description: "Implemented a more robust context-driven field order for the 'Add Account' form with floating labels." },
            { type: 'UI/UX', description: "Improved form responsiveness and loading states for a smoother entry experience." },
        ]
    },
    {
        version: "1.7.8",
        date: "Jan 31, 2026",
        changes: [
            { type: 'Fix', description: "Resolved a critical build error caused by incorrect component import paths on the 'Debts & Dues' page." },
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
        version: "1.6.0",
        date: "Dec 11, 2025",
        changes: [
            { type: 'Security', description: "Upgraded Next.js to version 16.0.7 to patch a critical security vulnerability (CVE-2025-55182)." },
        ]
    },
    {
        version: "1.5.1",
        date: "Dec 16, 2025",
        changes: [
            { type: 'Feature', description: "Added contextual page-specific settings to the user profile dropdown for quick access without navigating away." },
            { type: 'Feature', description: "Enhanced both 'ExpenseWise' and 'Enhanced' Excel exports to include icon names for categories and tags." },
            { type: 'Feature', description: "Added an 'All Accounts' option to clear all transactions without deleting account structures." },
            { type: 'Feature', description: "Replaced the 'Reset Everything' button with a selective reset dialog, allowing users to choose which data types to delete." },
            { type: 'UI', description: "Added confirmation dialogs when deleting categories and tags to prevent accidental removal." },
        ]
    },
    {
        version: "1.5.0",
        date: "Dec 15, 2025",
        changes: [
            { type: 'Feature', description: "Added the ability to archive and reactivate categories and tags to hide them from transaction forms." },
        ]
    },
    {
        version: "1.4.9",
        date: "Dec 14, 2025",
        changes: [
            { type: 'Fix', description: "Refined credit card payment notifications to only appear when there is an outstanding balance, preventing unnecessary alerts for paid-off cards." },
        ]
    },
    {
        version: "1.4.8",
        date: "Dec 06, 2025",
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
        date: "Dec 12, 2025",
        changes: [
            { type: 'Fix', description: "Resolved a persistent build failure by upgrading Next.js to the latest patched version to address a critical security vulnerability." },
            { type: 'Fix', description: "Corrected a visual bug causing a 'double border' on focused form inputs." },
            { type: 'Fix', description: "Removed hardcoded currency symbols from input fields for better internationalization." },
            { type: 'Fix', description: "Ensured consistent font sizes across all elements in the transaction form." },
        ]
    },
    {
        version: "1.4.6",
        date: "Dec 10, 2025",
        changes: [
            { type: 'Feature', description: "Added visibility toggles in Analysis Settings to show or hide individual charts and the AI insights card on the Analysis page." },
        ]
    },
    {
        version: "1.4.5",
        date: "Dec 09, 2025",
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
        date: "Dec 08, 2025",
        changes: [
            { type: 'Fix', description: "Corrected the logic for 'Credit Card Payment' transactions to allow them to be recorded as an expense from non-credit card accounts (e.g., a bank account)." },
        ]
    },
    {
        version: "1.4.3",
        date: "Dec 06, 2025",
        changes: [
            { type: 'Fix', description: "Resolved all persistent Firestore security rule errors that were preventing data from being displayed on several pages. The rules have been completely overhauled for correctness and stability." },
        ]
    },
    {
        version: "1.4.2",
        date: "Dec 05, 2025",
        changes: [
            { type: 'Fix', description: "Resolved persistent build errors by removing a problematic and unused account settings component." },
            { type: 'Fix', description: "Corrected internal component import paths to improve application stability." },
        ]
    },
    {
        version: "1.4.1",
        date: "Dec 03, 2025",
        changes: [
            { type: 'Feature', description: "Added a secure way to store and view non-sensitive credit card details (nickname, last 4 digits, etc.) to easily identify cards." },
            { type: 'UI', description: "Made credit card icons on the Accounts page clickable to directly open the new card details view." },
            { type: 'Feature', description: "Enhanced the Excel importer to automatically match and map accounts from your file to existing accounts in the app, with the option to override." },
        ]
    },
    {
        version: "1.4.0",
        date: "Nov 30, 2025",
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
        date: "Nov 28, 2025",
        changes: [
            { type: 'Feature', description: "Added the ability to delete a person and all their associated records from the Debts & Dues page." },
            { type: 'Fix', description: "The 'Save and New' button in the transaction form now retains the date from the previous entry to make back-dating easier." },
        ]
    },
    {
        version: "1.3.9",
        date: "Nov 26, 2025",
        changes: [
            { type: 'Feature', description: "Grouped transactions by person on the Debts & Dues page for a clearer overview." },
            { type: 'Feature', description: "Added a quick-add button to create new transactions for existing people on the Debts page." },
            { type: 'Fix', description: "Corrected the net amount calculation to only include 'pending' transactions." },
            { type: 'Fix', description: "Removed the 'Settle Debt' success notification for a quieter experience." },
            { type: 'Fix', description: "Removed default '0.00' values from amount fields in forms." },
        ]
    },
    {
        version: "1.3.8",
        date: "Nov 24, 2025",
        changes: [
            { type: 'Feature', description: "Added a new 'Debts & Dues' page to track lent and borrowed money." },
            { type: 'Feature', description: "Added the ability to mark transactions as 'settled'." },
            { type: 'Fix', description: "Resolved a build error caused by an incorrect component import for the DateTimePicker." },
        ]
    },
    {
        version: "1.3.7",
        date: "Nov 22, 2025",
        changes: [
            { type: 'Fix', description: "Addressed various build errors and permission issues to improve application stability." },
            { type: 'Feature', description: "Added a dedicated popup for credit card payment history on the Accounts page." },
        ]
    },
    {
        version: "1.3.6",
        date: "Nov 20, 2025",
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
        date: "Nov 18, 2025",
        changes: [
            { type: 'Feature', description: "Added the ability to merge multiple categories or tags into a single new or existing item, streamlining data organization." },
            { type: 'Feature', description: "Made category and tag badges in the transaction list clickable, automatically applying a filter for that item." },
            { type: 'Feature', description: "Added a collapsible tag breakdown in the category analysis table to show spending distribution within each category." },
            { type: 'Fix', description: "Improved data import logic to correctly normalize and merge similar category/tag names (e.g., 'cashback' and 'Cash Back')." },
        ]
    },
    {
        version: "1.3.4",
        date: "Nov 16, 2025",
        changes: [
            { type: 'Fix', description: "Corrected an issue where special financial categories like 'Credit Card Payment' were always excluded from analysis, regardless of user settings." },
            { type: 'Fix', description: "Resolved a build error caused by an incorrect import path for AnalysisSettingsContent." },
            { type: 'Feature', description: "Added a toggle in Analysis Settings to show or hide the 'Normal Total' summary card." },
        ]
    },
    {
        version: "1.3.3",
        date: "Nov 14, 2025",
        changes: [
            { type: 'Fix', description: "Resolved a layout issue in the category analysis table that caused a runtime error when expanding rows." },
            { type: 'Fix', description: "Corrected the alignment of the notification panel to ensure it appears centered below the bell icon." },
        ]
    },
    {
        version: "1.3.2",
        date: "Nov 12, 2025",
        changes: [
            { type: 'Feature', description: "Added a notification center to the header to provide timely alerts for events like upcoming credit card payments." },
            { type: 'Feature', description: "Added a 'Compact View' option in the Profile settings to allow for a denser transaction list." },
            { type: 'Fix', description: "Streamlined the transaction page layout by removing the redundant main page header." },
            { type: 'Fix', description: "Resolved a crash on the notifications panel caused by a missing component import." },
        ]
    },
    {
        version: "1.3.1",
        date: "Nov 10, 2025",
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
        date: "Nov 08, 2025",
        changes: [
            { type: 'Fix', description: "Resolved a persistent Firestore query error that was incorrectly reported as 'Missing or insufficient permissions' by refactoring data fetching logic on the transactions and analysis pages." },
            { type: 'Fix', description: "Replaced the date range tabs on the analysis page with a dropdown menu to improve usability and accommodate more options, including a custom date range picker." },
            { type: 'Feature', description: "Added a multi-select dropdown to the analysis page to allow filtering by one or more financial accounts." },
            { type: 'Fix', description: "Enabled clickable rows in the 'Spending by Category' table to navigate directly to a pre-filtered list of corresponding transactions." },
        ]
    },
    {
        version: "1.2.9",
        date: "Nov 06, 2025",
        changes: [
            { type: 'Feature', description: "Introduced a new 'Analysis' page with detailed expense breakdowns, trend charts, and AI-powered insights." },
            { type: 'Feature', description: "Added full support for income categorization, allowing for a complete financial overview on the Analysis page." },
            { type: 'Fix', description: "Resolved server errors on the Analysis page caused by improper data handling for the AI flow." },
        ]
    },
    {
        version: "1.2.8",
        date: "Nov 04, 2025",
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
        date: "Nov 02, 2025",
        changes: [
            { type: 'Feature', description: "Added a 'Credit Limit Downgrade' category to reduce a credit card's limit via an expense transaction." },
        ]
    },
    {
        version: "1.2.6",
        date: "Oct 31, 2025",
        changes: [
            { type: 'Feature', description: "Added a 'Payment History' option to credit card menus for quick access to payment transactions." },
        ]
    },
    {
        version: "1.2.5",
        date: "Oct 29, 2025",
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
        date: "Oct 27, 2025",
        changes: [
            { type: 'Feature', description: "Optimized transaction list performance by implementing list virtualization for large datasets." },
        ]
    },
    {
        version: "1.2.3",
        date: "Oct 25, 2025",
        changes: [
            { type: 'Fix', description: "Resolved multiple TypeScript type errors that were causing persistent build failures." },
            { type: 'Fix', description: "Corrected data handling in login, sign-up, and transaction processes to improve type safety." },
        ]
    },
    {
        version: "1.2.2",
        date: "Oct 23, 2025",
        changes: [
            { type: 'Feature', description: "Added search functionality to the transactions page to filter by description and amount." },
            { type: 'Fix', description: "Changed the search input placeholder to be more concise." },
        ]
    },
    {
        version: "1.2.1",
        date: "Oct 21, 2025",
        changes: [
            { type: 'Feature', description: "Implemented a true running balance calculation for all transactions, visible on the main list without requiring filtering." },
            { type: 'Fix', description: "Corrected bank account running balance to calculate forward from a starting balance of zero for the filtered period." },
        ]
    },
    {
        version: "1.2.0",
        date: "Oct 19, 2025",
        changes: [
            { type: 'Feature', description: "Added 'Select All' checkbox to the Excel importer for easier account selection." },
            { type: 'Fix', description: "Updated 'Clear All Data' function to correctly delete accounts in addition to transactions." },
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

            <div className="mt-16 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Separator className="bg-primary/10" />
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Badge className="bg-primary text-primary-foreground hover:bg-primary font-bold px-3 py-1 rounded-full">What's New</Badge>
                        <h2 className="text-2xl font-bold font-headline tracking-tight">Version 1.8.9</h2>
                    </div>
                    <p className="text-[12px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em]">February 19, 2026</p>
                    
                    <ul className="space-y-5">
                        <li className="flex items-start gap-4">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <p className="text-[15px] leading-relaxed text-foreground/80">
                                <span className="font-bold text-foreground">Redesigned Credit Card Summary:</span> Featured outstanding balance on the left with stacked IN, OUT, and LIMIT totals on the right for superior clarity.
                            </p>
                        </li>
                        <li className="flex items-start gap-4">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <p className="text-[15px] leading-relaxed text-foreground/80">
                                <span className="font-bold text-foreground">Standardized Summary Labels:</span> Added explicit colons to financial totals (IN:, OUT:, LIMIT:) for a cleaner dashboard aesthetic.
                            </p>
                        </li>
                        <li className="flex items-start gap-4">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <p className="text-[15px] leading-relaxed text-foreground/80">
                                <span className="font-bold text-foreground">Dynamic Filter Ratios:</span> Implemented a responsive 70/20/10 width ratio for search and filters when active, optimizing mobile real estate.
                            </p>
                        </li>
                        <li className="flex items-start gap-4">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <p className="text-[15px] leading-relaxed text-foreground/80">
                                <span className="font-bold text-foreground">Unified Filter Management:</span> Integrated the "Clear All" reset action directly into the filter unit for a more efficient workflow.
                            </p>
                        </li>
                        <li className="flex items-start gap-4">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <p className="text-[15px] leading-relaxed text-foreground/80">
                                <span className="font-bold text-foreground">Premium Transaction Elevation:</span> Applied permanent depth shadows to all records with a featured top-incline shadow for the latest entry.
                            </p>
                        </li>
                        <li className="flex items-start gap-4">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <p className="text-[15px] leading-relaxed text-foreground/80">
                                <span className="font-bold text-foreground">Metadata Alignment:</span> Harmonized running balance contrast and color with account names and timestamps for a unified UI.
                            </p>
                        </li>
                    </ul>
                    
                    <div className="p-5 rounded-2xl bg-primary/[0.02] border border-primary/10 mt-10">
                        <p className="text-[14px] leading-relaxed text-foreground/60 italic font-medium">
                            This update finalizes the premium transaction experience with an optimized summary layout, dynamic filtering ratios, and enhanced visual depth for a truly professional fintech feel.
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="text-center pt-16 mt-8 border-t border-muted/50">
                <p className="text-xs font-medium text-muted-foreground/50 tracking-wide uppercase">
                    ExpenseWise &bull; v{appVersion} &bull; Built with pride.
                </p>
            </div>
        </div>
    );
}
