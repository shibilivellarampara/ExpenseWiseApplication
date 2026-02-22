'use client';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserPlus, Wallet } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { UserMembership } from '@/lib/types';
import { collection, orderBy, query } from 'firebase/firestore';
import { useState } from 'react';
import { CreateWalletDialog } from '@/components/family/CreateWalletDialog';
import { JoinWalletDialog } from '@/components/family/JoinWalletDialog';
import { WalletList } from '@/components/family/WalletList';

export default function FamilyWalletPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const membershipsQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/memberships`), orderBy('joinedAt', 'desc')) : null
    , [firestore, user]);

    const { data: memberships, isLoading } = useCollection<UserMembership>(membershipsQuery);

    return (
        <div className="w-full space-y-6 pb-32">
            <PageHeader 
                title="Family Wallets" 
                description="Collaborative shared ledgers for your family and household."
            >
                <div className="flex gap-2">
                    <JoinWalletDialog>
                        <Button variant="outline" size="sm" className="rounded-xl h-10 border-primary/20 text-primary hover:bg-primary/5">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Join
                        </Button>
                    </JoinWalletDialog>
                    <CreateWalletDialog>
                        <Button size="sm" className="rounded-xl h-10 shadow-lg shadow-primary/20">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create New
                        </Button>
                    </CreateWalletDialog>
                </div>
            </PageHeader>

            <div className="space-y-6">
                <WalletList memberships={memberships || []} isLoading={isLoading} />
            </div>
        </div>
    );
}
