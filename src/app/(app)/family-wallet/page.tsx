
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
                <div className="flex items-center gap-3">
                    <JoinWalletDialog>
                        <Button variant="outline" size="sm" className="h-10 rounded-full px-4 border-muted-foreground/20 text-xs font-medium bg-transparent shadow-none shrink-0 hover:bg-card gap-2">
                            <UserPlus className="h-4 w-4" />
                            <span className="hidden sm:inline">Join Wallet</span>
                            <span className="sm:hidden">Join</span>
                        </Button>
                    </JoinWalletDialog>
                    <CreateWalletDialog>
                        <Button variant="outline" size="sm" className="h-10 rounded-full px-4 border-muted-foreground/20 text-xs font-medium bg-transparent shadow-none shrink-0 hover:bg-card gap-2">
                            <PlusCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">Create New</span>
                            <span className="sm:hidden">Create</span>
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
