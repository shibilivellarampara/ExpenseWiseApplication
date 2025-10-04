import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Expense } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { Tag } from "lucide-react";

interface ExpensesTableProps {
  expenses: Expense[];
  isLoading?: boolean;
}

const categoryColors: { [key: string]: string } = {
    Food: 'bg-blue-100 text-blue-800',
    Transport: 'bg-green-100 text-green-800',
    Shopping: 'bg-yellow-100 text-yellow-800',
    Utilities: 'bg-purple-100 text-purple-800',
    Entertainment: 'bg-pink-100 text-pink-800',
    Health: 'bg-red-100 text-red-800',
    Other: 'bg-gray-100 text-gray-800',
};


export function ExpensesTable({ expenses, isLoading }: ExpensesTableProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    </TableRow>
                ))
            ) : expenses.length > 0 ? expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{expense.date instanceof Date ? expense.date.toLocaleDateString() : ''}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={categoryColors[expense.category] || 'bg-gray-100 text-gray-800'}>
                    {expense.category}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                    {expense.description}
                    {expense.tag && (
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                           <Tag className="w-3 h-3 mr-1" /> {expense.tag}
                        </div>
                    )}
                </TableCell>
                <TableCell>{expense.paymentMethod}</TableCell>
                <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No expenses found. Click "Add Expense" to get started!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

    