'use client';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle, KeyRound } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { SharedSpaceMember } from '@/lib/types';
import { collectionGroup, query, where } from 'firebase/firestore';
import { CreateSharedSpaceDialog } from '@/components/shared/CreateSharedSpaceDialog';
import { JoinSharedSpaceDialog } from '@/components/shared/JoinSharedSpaceDialog';
import { SharedSpacesList } from '@/components/shared/SharedSpacesList';

export default function SharedSpacesPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const membershipsQuery = useMemoFirebase(() =>
    user ? query(collectionGroup(firestore, 'members'), where('uid', '==', user.uid)) : null
  , [firestore, user]);

  const { data: spaces, isLoading } = useCollection<SharedSpaceMember>(membershipsQuery);

  return (
    <div className="w-full space-y-6 pb-32">
      <PageHeader description="Track expenses you split with someone else, separate from your personal expenses.">
        <JoinSharedSpaceDialog>
          <Button variant="outline" className="h-10 px-4 rounded-xl gap-2">
            <KeyRound className="h-4 w-4" />
            <span>Join</span>
          </Button>
        </JoinSharedSpaceDialog>
        <CreateSharedSpaceDialog>
          <Button className="h-10 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>Create</span>
          </Button>
        </CreateSharedSpaceDialog>
      </PageHeader>

      <SharedSpacesList spaces={spaces || []} isLoading={isLoading} />
    </div>
  );
}
