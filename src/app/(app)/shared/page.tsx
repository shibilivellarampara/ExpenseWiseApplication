'use client';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle, KeyRound } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { useMySharedSpaces } from '@/hooks/use-my-shared-spaces';
import { CreateSharedSpaceDialog } from '@/components/shared/CreateSharedSpaceDialog';
import { JoinSharedSpaceDialog } from '@/components/shared/JoinSharedSpaceDialog';
import { SharedSpacesList } from '@/components/shared/SharedSpacesList';

export default function SharedSpacesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { spaces, isLoading } = useMySharedSpaces(firestore, user?.uid);

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

      <SharedSpacesList spaces={spaces} currentUid={user?.uid} isLoading={isLoading} />
    </div>
  );
}
