import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Suspense } from 'react';
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart';
import { ExpensesBarChart } from '@/components/dashboard/ExpensesBarChart';
import { Skeleton } from '@/components/ui/skeleton';

// Mock data, to be replaced with Firestore data
const mockExpenseData = [
  { date: '2023-11-01', amount: 50, category: 'Food' },
  { date: '2023-11-02', amount: 25, category: 'Transport' },
  { date: '2023-11-02', amount: 120, category: 'Shopping' },
  { date: '2023-11-03', amount: 80, category: 'Entertainment' },
  { date: '2023-11-04', amount: 45, category: 'Food' },
  { date: '2023-11-05', amount: 30, category: 'Transport' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Welcome to your Dashboard" description="Here's a summary of your financial activity." />
      
      <Suspense fallback={<DashboardStats.Skeleton />}>
        <DashboardStats />
      </Suspense>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">Weekly Expenses</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <Suspense fallback={<Skeleton className="h-[350px] w-full" />}>
              <ExpensesBarChart data={mockExpenseData} />
            </Suspense>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
             <Suspense fallback={<Skeleton className="h-[350px] w-full" />}>
              <CategoryPieChart data={mockExpenseData} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
