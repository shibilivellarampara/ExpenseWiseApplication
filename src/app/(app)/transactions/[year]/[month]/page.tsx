

import { MonthlyExpensesClient } from '@/components/transactions/MonthlyExpensesClient';

interface MonthlyExpensesPageProps {
    params: {
        year: string;
        month: string;
    };
}

export default function MonthlyExpensesPage({ params }: MonthlyExpensesPageProps) {
  return (
    <div className="w-full h-full flex flex-col">
        <MonthlyExpensesClient year={params.year} month={params.month} />
    </div>
  );
}
