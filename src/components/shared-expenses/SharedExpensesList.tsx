
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SharedExpense, UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Copy, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Badge } from "../ui/badge";

const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const MemberList = ({ memberIds }: { memberIds: string[] }) => {
    const firestore = useFirestore();
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMembers = async () => {
            if (!firestore || !memberIds) {
                setIsLoading(false);
                return;
            };
            setIsLoading(true);
            try {
                const memberProfiles = await Promise.all(
                    memberIds.map(async (id) => {
                        const userDoc = await getDoc(doc(firestore, 'users', id));
                        return userDoc.data() as UserProfile;
                    })
                );
                setMembers(memberProfiles.filter(p => p && p.id));
            } catch (error) {
                console.error("Error fetching member profiles:", error);
                setMembers([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMembers();
    }, [firestore, memberIds]);

    if (isLoading) {
        return (
             <div className="space-y-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <TooltipProvider>
                <div className="flex -space-x-2 overflow-hidden">
                    {members.map((member) => (
                        <Tooltip key={member.id}>
                            <TooltipTrigger asChild>
                                <Avatar className="inline-block h-8 w-8 rounded-full ring-2 ring-background">
                                    <AvatarImage src={member.photoURL || undefined} />
                                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{member.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            </TooltipProvider>
            <div className="flex flex-wrap gap-1">
                {members.map(member => (
                    <Badge key={member.id} variant="secondary">{member.name}</Badge>
                ))}
            </div>
        </div>
    );
}


export function SharedExpensesList({ sharedExpenses, isLoading }: { sharedExpenses: SharedExpense[], isLoading: boolean }) {
    const { toast } = useToast();

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied!", description: "Join code copied to clipboard." });
    }
    
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
                <p className="text-muted-foreground mt-2">Click "Create Shared Space" or "Join a Space" to get started.</p>
            </div>
        );
    }
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sharedExpenses.map(item => (
                <Card key={item.id} className="flex flex-col">
                    <CardHeader>
                        <CardTitle>{item.name}</CardTitle>
                        {item.createdAt && (
                            <CardDescription>Created on {item.createdAt.toDate().toLocaleDateString()}</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4 flex-grow">
                        <div>
                            <p className="text-sm font-medium mb-2">Members</p>
                            <MemberList memberIds={item.memberIds} />
                        </div>
                         {item.joinId && (
                            <div>
                                <p className="text-sm font-medium">Join Code</p>
                                <div className="flex items-center gap-2">
                                    <p className="font-mono text-sm tracking-widest bg-muted px-2 py-1 rounded">{item.joinId}</p>
                                     <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(item.joinId!)}>
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Copy Code</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline" className="w-full">
                            <Link href={`/shared-expenses/${item.id}`}>View Details</Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}
