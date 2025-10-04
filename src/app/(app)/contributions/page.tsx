
'use client';

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ContributionsList } from "@/components/contributions/ContributionsList";
import { AddContributionSheet } from "@/components/contributions/AddContributionSheet";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, doc, getDoc, onSnapshot } from "firebase/firestore";
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
            const userPromises = userIds.map(async id => {
                if (!id) return null;
                const userDocRef = doc(firestore, 'users', id);
                try {
                    const docSnap = await getDoc(userDocRef);
                    if (docSnap.exists()) {
                        return { id: docSnap.id, ...docSnap.data() } as UserProfile;
                    }
                } catch (e) {
                    console.error("Error fetching user:", id, e);
                }
                return null;
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
    }, [firestore, userIds.join(',')]); // Rerun when userIds change (stringified for dependency array)

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
        // Ensure the current user is always in the list for the form
        if (user) {
            idSet.add(user.uid);
        }
        return Array.from(idSet);
    }, [contributions, user]);

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

    const userListForForm = useMemo(() => Object.values(userMap), [userMap]);

    return (
        <div className="w-full space-y-8">
            <PageHeader title="Shared Expenses" description="Track expenses shared with friends and family.">
                <AddContributionSheet users={userListForForm}>
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
