
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SharedExpense, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useFirestore, useUser } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

interface SharedExpensesListProps {
    sharedExpenses: SharedExpense[];
    isLoading?: boolean;
}

const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const MemberAvatars = ({ memberIds }: { memberIds: string[] }) => {
    const firestore = useFirestore();
    const [members, setMembers] = useState<UserProfile[]>([]);

    useEffect(() => {
        const fetchMembers = async () => {
            if (!firestore) return;
            const memberProfiles = await Promise.all(
                memberIds.map(async (id) => {
                    const userDoc = await getDoc(doc(firestore, 'users', id));
                    return userDoc.data() as UserProfile;
                })
            );
            setMembers(memberProfiles.filter(p => p));
        };
        fetchMembers();
    }, [firestore, memberIds]);

    return (
        <div className="flex -space-x-2 overflow-hidden">
            {members.map(member => (
                <Avatar key={member.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-background">
                    <AvatarImage src={member.photoURL || undefined} />
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                </Avatar>
            ))}
        </div>
    )
}

export function SharedExpensesList({ sharedExpenses, isLoading }: SharedExpensesListProps) {
    
    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                     <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent>
                           <Skeleton className="h-8 w-1/4 mb-2" />
                           <Skeleton className="h-4 w-1/3" />
                        </CardContent>
                        <CardFooter>
                            <Skeleton className="h-10 w-full" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }

    if (sharedExpenses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No Shared Spaces Yet</h3>
                <p className="text-muted-foreground mt-2">Click "Create Shared Space" to get started.</p>
            </div>
        );
    }
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sharedExpenses.map(item => (
                <Card key={item.id}>
                    <CardHeader>
                        <CardTitle>{item.name}</CardTitle>
                        <CardDescription>Created on {item.createdAt.toDate().toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm font-medium">Members</p>
                            <MemberAvatars memberIds={item.memberIds} />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" className="w-full">View Details</Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}
