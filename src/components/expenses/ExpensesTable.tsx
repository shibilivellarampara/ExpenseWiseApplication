'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EnrichedExpense, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { Tag, Pilcrow } from "lucide-react";
import * as LucideIcons from 'lucide-react';
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { getCurrencySymbol } from "@/lib/currencies";

interface ExpensesTableProps {
  expenses: EnrichedExpense[];
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
  const { user } = useUser();
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

  const renderCategoryIcon = (iconName: string | undefined) => {
    if (!iconName) return <Pilcrow className="mr-2 h-4 w-4" />;
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="mr-2 h-4 w-4" /> : <Pilcrow className="mr-2 h-4 w-4" />;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
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
                        <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    </TableRow>
                ))
            ) : expenses.length > 0 ? expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{expense.date.toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`flex items-center ${categoryColors[expense.category?.name || ''] || 'bg-gray-100 text-gray-800'}`}>
                    {renderCategoryIcon(expense.category?.icon)}
                    {expense.category?.name || 'Uncategorized'}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                    {expense.description}
                    {expense.tag && (
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                           <Tag className="w-3 h-3 mr-1" /> {expense.tag.name}
                        </div>
                    )}
                </TableCell>
                <TableCell>{expense.paymentMethod?.name || '-'}</TableCell>
                <TableCell className="text-right">{currencySymbol}{expense.amount.toFixed(2)}</TableCell>
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
