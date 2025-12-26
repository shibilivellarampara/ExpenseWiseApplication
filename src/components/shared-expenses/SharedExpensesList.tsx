
'use client';

import { SharedLedger, UserProfile } from "@/lib/types";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "../ui/tooltip";

interface SharedExpensesListProps {
    ledgers: SharedLedger[];
    userProfileMap: Map<string, UserProfile>;
    isLoading: boolean;
}

export function SharedExpensesList({ ledgers, userProfileMap, isLoading }: SharedExpensesListProps) {
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
                <Link key={ledger.id} href={`/shared-expenses/${ledger.id}`} passHref>
                    <Card className="hover:bg-accent transition-colors cursor-pointer h-full flex flex-col">
                        <CardHeader className="flex-grow">
                            <CardTitle>{ledger.name}</CardTitle>
                            <CardDescription>{ledger.memberIds.length} members</CardDescription>
                        </CardHeader>
                        <div className="p-6 pt-0 flex justify-between items-center">
                            <div className="flex -space-x-2">
                                <TooltipProvider>
                                    {ledger.memberIds.slice(0, 4).map(memberId => {
                                        const member = userProfileMap.get(memberId);
                                        return (
                                            <Tooltip key={memberId}>
                                                <TooltipTrigger asChild>
                                                    <Avatar className="border-2 border-background">
                                                        <AvatarImage src={member?.photoURL || undefined} alt={member?.name || ''} />
                                                        <AvatarFallback>{getInitials(member?.name)}</AvatarFallback>
                                                    </Avatar>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{member?.name || 'Unknown User'}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
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
            ))}
        </div>
    );
}
