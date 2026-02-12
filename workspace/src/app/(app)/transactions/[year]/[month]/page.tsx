import { MonthlyExpensesClient } from '@/components/transactions/MonthlyExpensesClient';

interface MonthlyExpensesPageProps {
    params: Promise<{
        year: string;
        month: string;
    }>;
}

export default async function MonthlyExpensesPage({ params }: MonthlyExpensesPageProps) {
  const { year, month } = await params;
  return <MonthlyExpensesClient year={year} month={month} />;
}
