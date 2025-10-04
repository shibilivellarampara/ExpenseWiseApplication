'use client';

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ContributionsList } from "@/components/contributions/ContributionsList";
import { AddContributionSheet } from "@/components/contributions/AddContributionSheet";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Contribution, EnrichedContribution, UserProfile } from "@/lib/types";
import { useMemo } from "react";

export default function ContributionsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const contributionsQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/contributions`), orderBy('date', 'desc')) : null
    , [firestore, user]);

    // For simplicity, we'll fetch all users. In a larger app, you'd fetch only relevant users.
    const usersQuery = useMemoFirebase(() => 
        firestore ? collection(firestore, 'users') : null
    , [firestore]);

    const { data: contributions, isLoading: contributionsLoading } = useCollection<Contribution>(contributionsQuery);
    const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

    const isLoading = contributionsLoading || usersLoading;

    const userMap = useMemo(() => new Map(users?.map(u => [u.id, u])), [users]);

    const enrichedContributions: EnrichedContribution[] = useMemo(() => {
        if (!contributions || !userMap.size) return [];
        return contributions.map(c => {
            const date = c.date instanceof Date ? c.date : c.date.toDate();
            const contributorsWithShares = c.contributorShares.map(share => {
                const contributorUser = userMap.get(share.userId);
                return contributorUser ? { ...contributorUser, share: share.share } : null;
            }).filter(Boolean) as (UserProfile & { share: number })[];

            return {
                ...c,
                date,
                paidBy: userMap.get(c.paidById),
                contributors: contributorsWithShares,
            }
        })
    }, [contributions, userMap]);


    return (
        <div className="space-y-8">
            <PageHeader title="Shared Expenses" description="Track expenses shared with friends and family.">
                <AddContributionSheet>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Shared Expense
                    </Button>
                </AddContributionSheet>
            </PageHeader>
            <ContributionsList contributions={enrichedContributions} isLoading={isLoading} />
        </div>
    );
}
