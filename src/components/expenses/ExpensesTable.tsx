'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EnrichedExpense, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { Tag, Pilcrow } from "lucide-react";
import * as LucideIcons from 'lucide-react';
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { getCurrencySymbol } from "@/lib/currencies";
import { useMediaQuery } from "@/hooks/use-media-query";

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


const renderIcon = (iconName: string | undefined) => {
  if (!iconName) return <Pilcrow className="mr-2 h-4 w-4 text-muted-foreground" />;
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent ? <IconComponent className="mr-2 h-4 w-4 text-muted-foreground" /> : <Pilcrow className="mr-2 h-4 w-4 text-muted-foreground" />;
};

function DesktopTable({ expenses, currencySymbol }: { expenses: EnrichedExpense[], currencySymbol: string }) {
   return (
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
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{expense.date.toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`flex items-center w-fit ${categoryColors[expense.category?.name || ''] || 'bg-gray-100 text-gray-800'}`}>
                    {renderIcon(expense.category?.icon)}
                    {expense.category?.name || 'Uncategorized'}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                    {expense.description}
                    {expense.tag && (
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                           {renderIcon(expense.tag.icon)} {expense.tag.name}
                        </div>
                    )}
                </TableCell>
                <TableCell className="flex items-center">
                  {renderIcon(expense.paymentMethod?.icon)}
                  {expense.paymentMethod?.name || '-'}
                </TableCell>
                <TableCell className="text-right">{currencySymbol}{expense.amount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
   );
}


function MobileCardList({ expenses, currencySymbol }: { expenses: EnrichedExpense[], currencySymbol: string }) {
    return (
        <div className="space-y-4">
            {expenses.map((expense) => (
                <Card key={expense.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                             <CardTitle className="text-lg">{expense.description || 'Expense'}</CardTitle>
                             <div className="text-lg font-bold text-right">{currencySymbol}{expense.amount.toFixed(2)}</div>
                        </div>
                         <CardDescription>{expense.date.toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Category</span>
                            <Badge variant="secondary" className={`flex items-center w-fit ${categoryColors[expense.category?.name || ''] || 'bg-gray-100 text-gray-800'}`}>
                                {renderIcon(expense.category?.icon)}
                                {expense.category?.name || 'Uncategorized'}
                            </Badge>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Payment</span>
                             <span className="flex items-center font-medium">
                                {renderIcon(expense.paymentMethod?.icon)}
                                {expense.paymentMethod?.name || '-'}
                            </span>
                         </div>
                         {expense.tag && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Tag</span>
                                <span className="flex items-center font-medium">
                                    {renderIcon(expense.tag.icon)}
                                    {expense.tag.name}
                                </span>
                            </div>
                         )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export function ExpensesTable({ expenses, isLoading }: ExpensesTableProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/4 mt-2" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><Skeleton className="h-5 w-1/4" /><Skeleton className="h-5 w-1/3" /></div>
              <div className="flex justify-between"><Skeleton className="h-5 w-1/4" /><Skeleton className="h-5 w-1/3" /></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (expenses.length === 0) {
    return (
       <Card>
          <CardContent className="pt-6">
              <div className="h-48 flex flex-col items-center justify-center text-center">
                 <h3 className="text-lg font-semibold">No expenses found.</h3>
                 <p className="text-muted-foreground">Click "Add Expense" to get started!</p>
              </div>
          </CardContent>
       </Card>
    );
  }

  if (isDesktop) {
    return (
       <Card>
          <CardContent className="pt-6">
             <DesktopTable expenses={expenses} currencySymbol={currencySymbol} />
          </CardContent>
       </Card>
    )
  }

  return <MobileCardList expenses={expenses} currencySymbol={currencySymbol} />
}
