
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useUser, commitBatchNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Account, Category } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { writeBatch, collection, doc, serverTimestamp, increment, query } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';

interface PayBillDialogProps {
  children: React.ReactNode;
  creditCard: Account;
  paymentAccounts: Account[];
  outstandingAmount: number;
}

export function PayBillDialog({ children, creditCard, paymentAccounts, outstandingAmount }: PayBillDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPaymentAccountId, setSelectedPaymentAccountId] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'full' | 'specific'>('full');
  const [specificAmount, setSpecificAmount] = useState<number | string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const categoriesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/categories`)) : null, [firestore, user]);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setSelectedPaymentAccountId('');
      setPaymentType('full');
      setSpecificAmount('');
    }
  }, [open]);


  const handlePayBill = async () => {
    if (!user || !firestore || !selectedPaymentAccountId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a payment account.' });
      return;
    }

    const amountToPay = paymentType === 'full' ? outstandingAmount : Number(specificAmount);

    if (amountToPay <= 0) {
        toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Payment amount must be greater than zero.' });
        return;
    }


    setIsProcessing(true);

    const paymentCategory = categories?.find(c => c.name === 'Credit Card Payment');
    const categoryId = paymentCategory?.id;

    if (!categoryId) {
        toast({ variant: 'destructive', title: 'Setup Required', description: 'The "Credit Card Payment" category was not found. Please ensure it exists in your category settings.' });
        setIsProcessing(false);
        return;
    }

    try {
      const batch = writeBatch(firestore);

      // 1. Create expense from the payment account
      const expenseRef = doc(collection(firestore, `users/${user.uid}/expenses`));
      batch.set(expenseRef, {
        id: expenseRef.id,
        userId: user.uid,
        type: 'expense',
        amount: amountToPay,
        description: `Payment for ${creditCard.name}`,
        date: new Date(),
        createdAt: serverTimestamp(),
        accountId: selectedPaymentAccountId,
        categoryId: categoryId,
      });

      // 2. Create income for the credit card
      const incomeRef = doc(collection(firestore, `users/${user.uid}/expenses`));
      batch.set(incomeRef, {
        id: incomeRef.id,
        userId: user.uid,
        type: 'income',
        amount: amountToPay,
        description: `Bill payment for ${creditCard.name}`,
        date: new Date(),
        createdAt: serverTimestamp(),
        accountId: creditCard.id,
        categoryId: categoryId,
      });

      // 3. Update account balances
      const paymentAccountRef = doc(firestore, `users/${user.uid}/accounts`, selectedPaymentAccountId);
      batch.update(paymentAccountRef, { balance: increment(-amountToPay) });

      const creditCardAccountRef = doc(firestore, `users/${user.uid}/accounts`, creditCard.id);
      batch.update(creditCardAccountRef, { balance: increment(amountToPay) });

      await commitBatchNonBlocking(batch, `users/${user.uid}`);

      toast({ title: 'Payment Successful', description: `Your payment for ${creditCard.name} has been recorded.` });
      setOpen(false);
    } catch (error: any) {
       toast({
          variant: "destructive",
          title: "Payment Failed",
          description: "There was an unexpected error. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const amountToPay = paymentType === 'full' ? outstandingAmount : Number(specificAmount);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay Bill for {creditCard.name}</DialogTitle>
          <DialogDescription>
            The total outstanding amount is {outstandingAmount.toFixed(2)}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="space-y-2">
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
             <div className="space-y-2">
                <Label>Payment Amount</Label>
                <RadioGroup value={paymentType} onValueChange={(value) => setPaymentType(value as 'full' | 'specific')} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="full" id="pay-full" />
                        <Label htmlFor="pay-full">Full Amount</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="specific" id="pay-specific" />
                        <Label htmlFor="pay-specific">Custom Amount</Label>
                    </div>
                </RadioGroup>
                 {paymentType === 'specific' && (
                    <div className="pt-2">
                         <Input
                            type="number"
                            placeholder="Enter amount to pay"
                            value={specificAmount}
                            onChange={(e) => setSpecificAmount(e.target.value)}
                            autoFocus
                        />
                    </div>
                )}
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handlePayBill} disabled={isProcessing || !selectedPaymentAccountId || amountToPay <= 0}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Pay ${amountToPay > 0 ? amountToPay.toFixed(2) : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
