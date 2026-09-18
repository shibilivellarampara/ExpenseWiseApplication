'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { SharedSpaceMember } from '@/lib/types';

interface SharedSpacesListProps {
  spaces: SharedSpaceMember[];
  isLoading?: boolean;
}

export function SharedSpacesList({ spaces, isLoading }: SharedSpacesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-2xl bg-card/50">
        <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold">No Shared Spaces Yet</h3>
        <p className="text-muted-foreground mt-1">Create a space or join one with a code to start sharing expenses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {spaces.map((member) => (
        <Link key={member.spaceId} href={`/shared/${member.spaceId}`}>
          <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-bold truncate">{member.spaceName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Code: {member.spaceId}</p>
              </div>
              <Badge variant={member.isOwner ? 'default' : 'outline'} className="shrink-0">
                {member.isOwner ? 'Owner' : 'Member'}
              </Badge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
