'use client';

import { PageHeader } from "@/components/PageHeader";
import { AddContributionSheet } from "@/components/contributions/AddContributionSheet";
import { ContributionsList } from "@/components/contributions/ContributionsList";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Contribution, EnrichedContribution, UserProfile } from "@/lib/types";
import { collection, doc, getDoc, orderBy, query } from "firebase/firestore";
import { PlusCircle } from "lucide-react";
import { useMemo, useState, useEffect } from "react";


async function fetchUsers(firestore: any, userIds: string[]): Promise<UserProfile[]> {
    if (!userIds || userIds.length === 0) return [];
    const users = await Promise.all(userIds.map(id => getDoc(doc(firestore, "users", id))));
    return users.map(userDoc => userDoc.data() as UserProfile).filter(Boolean);
}


export default function ContributionsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const contributionsQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/contributions`), orderBy('date', 'desc')) : null
    , [firestore, user]);

    const { data: contributions, isLoading: contributionsLoading } = useCollection<Contribution>(contributionsQuery);

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);

     useEffect(() => {
        const getAllUserIds = () => {
            const userIds = new Set<string>();
            if (user) userIds.add(user.uid);
            contributions?.forEach(c => {
                userIds.add(c.paidById);
                c.contributorShares.forEach(cs => userIds.add(cs.userId));
            });
            return Array.from(userIds);
        }

        if (contributions) {
            setUsersLoading(true);
            const allUserIds = getAllUserIds();
            fetchUsers(firestore, allUserIds)
                .then(setUsers)
                .finally(() => setUsersLoading(false));
        }

    }, [contributions, firestore, user]);

    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

    const enrichedContributions = useMemo((): EnrichedContribution[] => {
        if (!contributions) return [];
        return contributions.map(c => ({
            ...c,
            date: c.date.toDate(),
            paidBy: userMap.get(c.paidById),
            contributors: c.contributorShares.map(cs => ({
                ...(userMap.get(cs.userId) || {}),
                share: cs.share,
            })),
        }));
    }, [contributions, userMap]);
    
    const isLoading = contributionsLoading || usersLoading;

    return (
        <div className="w-full space-y-8">
            <PageHeader title="Contributions" description="Track your shared expenses and contributions with others.">
                <AddContributionSheet users={users}>
                     <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Shared Expense
                    </Button>
                </AddContributionSheet>
            </PageHeader>
            <ContributionsList contributions={enrichedContributions} isLoading={isLoading} />
        </div>
    )
}
