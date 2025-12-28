
import { SharedExpenseDetailClient } from '@/components/shared-expenses/SharedExpenseDetailClient';

export default function SharedExpenseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <SharedExpenseDetailClient id={params.id} />;
}
