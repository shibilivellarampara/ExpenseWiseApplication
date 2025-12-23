
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useUser, commitBatchNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Account } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { writeBatch, collection, doc, serverTimestamp, increment } from 'firebase/firestore';

interface PayBillDialogProps {
  children: React.ReactNode;
  creditCard: Account;
  paymentAccounts: Account[];
  outstandingAmount: number;
}

export function PayBillDialog({ children, creditCard, paymentAccounts, outstandingAmount }: PayBillDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPaymentAccountId, setSelectedPaymentAccountId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handlePayBill = async () => {
    if (!user || !firestore || !selectedPaymentAccountId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a payment account.' });
      return;
    }
    setIsProcessing(true);

    try {
      const batch = writeBatch(firestore);

      // 1. Create expense from the payment account
      const expenseRef = doc(collection(firestore, `users/${user.uid}/expenses`));
      batch.set(expenseRef, {
        id: expenseRef.id,
        userId: user.uid,
        type: 'expense',
        amount: outstandingAmount,
        description: `Payment for ${creditCard.name}`,
        date: new Date(),
        createdAt: serverTimestamp(),
        accountId: selectedPaymentAccountId,
        categoryId: 'credit_card_payment', // You might want a specific category ID
      });

      // 2. Create income for the credit card
      const incomeRef = doc(collection(firestore, `users/${user.uid}/expenses`));
      batch.set(incomeRef, {
        id: incomeRef.id,
        userId: user.uid,
        type: 'income',
        amount: outstandingAmount,
        description: 'Bill Payment Received',
        date: new Date(),
        createdAt: serverTimestamp(),
        accountId: creditCard.id,
        categoryId: 'credit_card_payment',
      });

      // 3. Update account balances
      const paymentAccountRef = doc(firestore, `users/${user.uid}/accounts`, selectedPaymentAccountId);
      batch.update(paymentAccountRef, { balance: increment(-outstandingAmount) });

      const creditCardAccountRef = doc(firestore, `users/${user.uid}/accounts`, creditCard.id);
      batch.update(creditCardAccountRef, { balance: increment(outstandingAmount) });

      await commitBatchNonBlocking(batch);

      toast({ title: 'Payment Successful', description: `Your payment for ${creditCard.name} has been recorded.` });
      setOpen(false);
      setSelectedPaymentAccountId('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Payment Failed', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay Bill for {creditCard.name}</DialogTitle>
          <DialogDescription>
            You are about to pay an outstanding amount of {outstandingAmount.toFixed(2)}. Select the account to pay from.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="payment-account">Pay from Account</Label>
          <Select value={selectedPaymentAccountId} onValueChange={setSelectedPaymentAccountId}>
            <SelectTrigger id="payment-account">
              <SelectValue placeholder="Select a bank account..." />
            </SelectTrigger>
            <SelectContent>
              {paymentAccounts.map(acc => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name} (Balance: {acc.balance.toFixed(2)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handlePayBill} disabled={isProcessing || !selectedPaymentAccountId}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
