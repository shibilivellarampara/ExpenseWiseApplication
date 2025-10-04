# **App Name**: ExpenseWise

## Core Features:

- User Authentication: Secure user authentication using Firebase Authentication with email/password and Google login. Store user profiles in Firestore.
- Expense Tracking: Enable users to add daily expenses with category, amount, description, and date. Display expenses in a sortable and filterable table.
- Excel Import: Allow users to import expenses from .xlsx or .csv files. Automatically map columns and save records to Firestore under the user's expenses.
- Contribution Tracking: Track shared expenses where multiple users contribute, including the total amount, list of contributors and their shares, and description.
- Dashboard Overview: Show a dashboard with total monthly expenses, top 3 categories, a pie chart of category-wise monthly spending, and a bar/line chart for daily/weekly expenses.

## Style Guidelines:

- Primary color: A calming blue (#64B5F6), evoking trust and stability.
- Background color: A very light blue (#E3F2FD), providing a clean and unobtrusive backdrop.
- Accent color: A vibrant green (#4CAF50) for key actions and visual interest.
- Font pairing: 'Poppins' (sans-serif) for headlines and 'PT Sans' (sans-serif) for body text. Note: currently only Google Fonts are supported.
- Maintain a clean, modern, mobile-friendly layout with a consistent navigation bar.
- Use simple, intuitive icons to represent expense categories and actions.
- Incorporate subtle animations to enhance user interaction and provide feedback, such as transitions when adding expenses or updating charts.