import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Expense } from "@/lib/types";

interface ExpensesTableProps {
  expenses: Expense[];
}

const categoryColors: { [key: string]: string } = {
    Food: 'bg-blue-100 text-blue-800',
    Transport: 'bg-green-100 text-green-800',
    Shopping: 'bg-yellow-100 text-yellow-800',
    Utilities: 'bg-purple-100 text-purple-800',
    Entertainment: 'bg-pink-100 text-pink-800',
};


export function ExpensesTable({ expenses }: ExpensesTableProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length > 0 ? expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{expense.date.toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={categoryColors[expense.category] || 'bg-gray-100 text-gray-800'}>
                    {expense.category}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{expense.description}</TableCell>
                <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No expenses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
