

import { MonthlyExpensesClient } from '@/components/transactions/MonthlyExpensesClient';

interface MonthlyExpensesPageProps {
    params: {
        year: string;
        month: string;
    };
}

export default function MonthlyExpensesPage({ params }: MonthlyExpensesPageProps) {
  return <MonthlyExpensesClient year={params.year} month={params.month} />;
}
