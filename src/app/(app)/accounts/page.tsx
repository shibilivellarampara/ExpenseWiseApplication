
'use client';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Account } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { AddAccountSheet } from '@/components/accounts/AddAccountSheet';
import { AccountsList } from '@/components/accounts/AccountsList';

export default function AccountsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const accountsQuery = useMemoFirebase(() => 
        user ? collection(firestore, `users/${user.uid}/accounts`) : null
    , [firestore, user]);

    const { data: accounts, isLoading } = useCollection<Account>(accountsQuery);

    return (
        <div className="w-full space-y-8">
            <PageHeader title="Accounts" description="Manage your financial accounts.">
                <AddAccountSheet>
                     <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Account
                    </Button>
                </AddAccountSheet>
            </PageHeader>

            <AccountsList accounts={accounts || []} isLoading={isLoading} />
        </div>
    )
}
