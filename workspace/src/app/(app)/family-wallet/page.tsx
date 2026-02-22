
'use client';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserPlus, Search, X } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { UserMembership } from '@/lib/types';
import { collection, orderBy, query } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import { CreateWalletDialog } from '@/components/family/CreateWalletDialog';
import { JoinWalletDialog } from '@/components/family/JoinWalletDialog';
import { WalletList } from '@/components/family/WalletList';
import { Input } from '@/components/ui/input';

export default function FamilyWalletPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [searchQuery, setSearchQuery] = useState('');

    const membershipsQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/memberships`), orderBy('joinedAt', 'desc')) : null
    , [firestore, user]);

    const { data: memberships, isLoading } = useCollection<UserMembership>(membershipsQuery);

    const filteredMemberships = useMemo(() => {
        if (!memberships) return [];
        return memberships.filter(m => 
            m.walletName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [memberships, searchQuery]);

    return (
        <div className="w-full space-y-6 pb-32">
            <PageHeader 
                title="Family Wallets" 
                description="Collaborative shared ledgers for your family and household."
            />

            <div className="flex items-center gap-3 bg-muted/20 -mx-4 px-4 py-3 mb-2 overflow-x-auto no-scrollbar pr-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search wallets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 bg-transparent border border-muted-foreground/20 shadow-none rounded-full focus-visible:ring-0"
                    />
                    {searchQuery && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                            onClick={() => setSearchQuery('')}
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-2">
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
            </div>

            <div className="space-y-6">
                <WalletList memberships={filteredMemberships} isLoading={isLoading} />
            </div>
        </div>
    );
}
