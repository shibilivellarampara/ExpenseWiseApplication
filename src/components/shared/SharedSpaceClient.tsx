'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, collection, query, orderBy, getDocs, writeBatch } from 'firebase/firestore';
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
  commitBatchNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { SharedSpace, SharedSpaceMember, SharedExpense, UserProfile } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AddSharedExpenseDialog } from '@/components/shared/AddSharedExpenseDialog';
import { SharedExpensesList } from '@/components/shared/SharedExpensesList';
import { useToast } from '@/hooks/use-toast';
import { Copy, PlusCircle, LogOut, Trash2, Loader2 } from 'lucide-react';

export function SharedSpaceClient({ spaceId }: { spaceId: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const myMembershipRef = useMemoFirebase(() =>
    user ? doc(firestore, `sharedSpaces/${spaceId}/members`, user.uid) : null
  , [firestore, user, spaceId]);
  const { data: myMembership, isLoading: isMembershipLoading } = useDoc<SharedSpaceMember>(myMembershipRef);

  const isMember = !!myMembership;

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  // Gated on isMember: a non-member's onSnapshot listener here would just be a
  // doomed `list`/`get` under the isSharedMember() rule — no point mounting it.
  const spaceRef = useMemoFirebase(() => (isMember ? doc(firestore, 'sharedSpaces', spaceId) : null), [firestore, spaceId, isMember]);
  const { data: space } = useDoc<SharedSpace>(spaceRef);

  const membersQuery = useMemoFirebase(() =>
    isMember ? collection(firestore, `sharedSpaces/${spaceId}/members`) : null
  , [firestore, spaceId, isMember]);
  const { data: members } = useCollection<SharedSpaceMember>(membersQuery);

  const expensesQuery = useMemoFirebase(() =>
    isMember ? query(collection(firestore, `sharedSpaces/${spaceId}/expenses`), orderBy('date', 'desc')) : null
  , [firestore, spaceId, isMember]);
  const { data: expenses, isLoading: isExpensesLoading } = useCollection<SharedExpense>(expensesQuery);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(spaceId);
    toast({ title: 'Code Copied' });
  };

  const handleLeave = async () => {
    if (!user || !firestore) return;
    setIsLeaving(true);
    try {
      await deleteDocumentNonBlocking(doc(firestore, `sharedSpaces/${spaceId}/members`, user.uid));
      toast({ title: 'Left Shared Space' });
      router.push('/shared');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLeaving(false);
    }
  };

  const handleDeleteSpace = async () => {
    if (!user || !firestore) return;
    setIsDeleting(true);
    try {
      const [membersSnap, expensesSnap] = await Promise.all([
        getDocs(collection(firestore, `sharedSpaces/${spaceId}/members`)),
        getDocs(collection(firestore, `sharedSpaces/${spaceId}/expenses`)),
      ]);
      const batch = writeBatch(firestore);
      membersSnap.forEach((d) => batch.delete(d.ref));
      expensesSnap.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(firestore, 'sharedSpaces', spaceId));
      await commitBatchNonBlocking(batch, `sharedSpaces/${spaceId}`);
      toast({ title: 'Shared Space Deleted' });
      router.push('/shared');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isMembershipLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-12">
        <h3 className="text-lg font-semibold">You're not a member of this space</h3>
        <p className="text-muted-foreground mt-1">Ask for a valid join code, or go back to your shared spaces.</p>
        <Button asChild className="mt-4">
          <Link href="/shared">Back to Shared Spaces</Link>
        </Button>
      </div>
    );
  }

  const isOwner = !!myMembership?.isOwner;

  return (
    <div className="w-full space-y-6 pb-32">
      <PageHeader title={space?.name} description={`Code: ${spaceId}`}>
        <Button variant="outline" size="sm" onClick={handleCopyCode} className="gap-2">
          <Copy className="h-4 w-4" /> Copy Code
        </Button>
      </PageHeader>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {(members || []).map((m) => (
            <Avatar key={m.uid} className="h-8 w-8 border-2 border-background">
              <AvatarImage src={m.photoURL || undefined} />
              <AvatarFallback>{(m.displayName || 'M').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <AddSharedExpenseDialog spaceId={spaceId} members={members || []}>
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" /> Add Expense
            </Button>
          </AddSharedExpenseDialog>

          {isOwner ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this shared space?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes the space and all shared expenses for every member. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSpace} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" disabled={isLeaving}>
                  {isLeaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave this shared space?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You'll lose access to its shared expenses until someone shares the code with you again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeave} className="bg-destructive hover:bg-destructive/90">Leave</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <SharedExpensesList
        expenses={expenses || []}
        members={members || []}
        currentUid={user?.uid}
        currency={userProfile?.defaultCurrency}
        isLoading={isExpensesLoading}
      />
    </div>
  );
}
