'use client';

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ContributionsList } from "@/components/contributions/ContributionsList";
import { AddContributionSheet } from "@/components/contributions/AddContributionSheet";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { Contribution, EnrichedContribution, UserProfile } from "@/lib/types";
import { useMemo, useEffect, useState } from "react";

// Hook to fetch multiple documents by ID
const useUsers = (userIds: string[]) => {
    const firestore = useFirestore();
    const [users, setUsers] = useState<Record<string, UserProfile>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore || userIds.length === 0) {
            setIsLoading(false);
            return;
        }

        const fetchUsers = async () => {
            setIsLoading(true);
            const userPromises = userIds.map(id => {
                const userDocRef = doc(firestore, 'users', id);
                // This is a simplified fetch, not using useDoc to avoid hook-in-loop
                return new Promise<UserProfile | null>(resolve => {
                    const unsub = onSnapshot(userDocRef, (snapshot) => {
                        if (snapshot.exists()) {
                            resolve({ id: snapshot.id, ...snapshot.data() } as UserProfile);
                        } else {
                            resolve(null);
                        }
                        unsub(); // Unsubscribe after getting the first snapshot
                    }, () => {
                        resolve(null); // Resolve null on error
                        unsub();
                    });
                });
            });

            const fetchedUsers = await Promise.all(userPromises);
            const userMap: Record<string, UserProfile> = {};
            fetchedUsers.forEach(user => {
                if (user) {
                    userMap[user.id] = user;
                }
            });
            setUsers(userMap);
            setIsLoading(false);
        };

        fetchUsers();
    }, [firestore, userIds.join(',')]); // Rerun when userIds change

    return { users, isLoading };
};


export default function ContributionsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const contributionsQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, `users/${user.uid}/contributions`), orderBy('date', 'desc')) : null
    , [firestore, user]);

    const { data: contributions, isLoading: contributionsLoading } = useCollection<Contribution>(contributionsQuery);

    // Get a unique list of all user IDs from all contributions
    const allUserIds = useMemo(() => {
        if (!contributions) return [];
        const idSet = new Set<string>();
        contributions.forEach(c => {
            idSet.add(c.paidById);
            c.contributorShares.forEach(share => idSet.add(share.userId));
        });
        return Array.from(idSet);
    }, [contributions]);

    const { users: userMap, isLoading: usersLoading } = useUsers(allUserIds);

    const isLoading = contributionsLoading || usersLoading;

    const enrichedContributions: EnrichedContribution[] = useMemo(() => {
        if (!contributions || Object.keys(userMap).length === 0) return [];
        return contributions.map(c => {
            const date = c.date instanceof Date ? c.date : c.date.toDate();
            const contributorsWithShares = c.contributorShares.map(share => {
                const contributorUser = userMap[share.userId];
                return contributorUser ? { ...contributorUser, share: share.share } : null;
            }).filter(Boolean) as (UserProfile & { share: number })[];

            return {
                ...c,
                date,
                paidBy: userMap[c.paidById],
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
