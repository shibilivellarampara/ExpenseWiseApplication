
'use client';

import { SharedLedger, UserProfile } from "@/lib/types";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

interface LedgerCardProps {
    ledger: SharedLedger;
}

function LedgerCard({ ledger }: LedgerCardProps) {
    const firestore = useFirestore();
    
    // Fetch only the owner's profile
    const ownerProfileRef = useMemoFirebase(() => 
        ledger.ownerId ? doc(firestore, `users/${ledger.ownerId}`) : null
    , [firestore, ledger.ownerId]);

    const { data: ownerProfile } = useDoc<UserProfile>(ownerProfileRef);

    return (
         <Link key={ledger.id} href={`/shared-expenses/${ledger.id}`} passHref>
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full flex flex-col">
                <CardHeader className="flex-grow">
                    <CardTitle>{ledger.name}</CardTitle>
                    <CardDescription>{ledger.memberIds.length} members</CardDescription>
                </CardHeader>
                <div className="p-6 pt-0 flex justify-between items-center">
                    <div className="flex -space-x-2">
                        <TooltipProvider>
                            {ownerProfile && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Avatar className="border-2 border-background">
                                            <AvatarImage src={ownerProfile.photoURL || undefined} alt={ownerProfile.name || ''} />
                                            <AvatarFallback>{getInitials(ownerProfile.name)}</AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{ownerProfile.name || 'Owner'}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {/* Display generic avatars for other members */}
                            {ledger.memberIds.filter(id => id !== ledger.ownerId).slice(0, 3).map(memberId => (
                                <Tooltip key={memberId}>
                                    <TooltipTrigger asChild>
                                        <Avatar className="border-2 border-background">
                                            <AvatarFallback><Users className="h-4 w-4" /></AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger>
                                     <TooltipContent>
                                        <p>A member</p>
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </TooltipProvider>
                        {ledger.memberIds.length > 4 && (
                            <Avatar className="border-2 border-background">
                                <AvatarFallback>+{ledger.memberIds.length - 4}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
            </Card>
        </Link>
    );
}


interface SharedExpensesListProps {
    ledgers: SharedLedger[];
    isLoading: boolean;
}

export function SharedExpensesList({ ledgers, isLoading }: SharedExpensesListProps) {
    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full" />
                ))}
            </div>
        );
    }

    if (ledgers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                <Users className="w-12 h-12 text-muted-foreground" />
                <h3 className="text-xl font-semibold mt-4">No Shared Ledgers Found</h3>
                <p className="text-muted-foreground mt-2">Create a new ledger to start sharing expenses.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ledgers.map(ledger => (
               <LedgerCard key={ledger.id} ledger={ledger} />
            ))}
        </div>
    );
}
