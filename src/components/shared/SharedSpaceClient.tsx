'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, collection, query, orderBy, getDocs, writeBatch, arrayRemove } from 'firebase/firestore';
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
  commitBatchNonBlocking,
} from '@/firebase';
import { SharedSpace, SharedSpaceMember, SharedExpense, SharedCategory, SharedTag, UserProfile } from '@/lib/types';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddSharedExpenseDialog } from '@/components/shared/AddSharedExpenseDialog';
import { SharedExpensesList } from '@/components/shared/SharedExpensesList';
import { SharedExpensesSummary } from '@/components/shared/SharedExpensesSummary';
import { SharedExpensesFilters, DEFAULT_SHARED_FILTERS, SharedFilters } from '@/components/shared/SharedExpensesFilters';
import { CopyPersonalExpensesDialog } from '@/components/shared/CopyPersonalExpensesDialog';
import { ManageSharedTaxonomyDialog } from '@/components/shared/ManageSharedTaxonomyDialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Copy, PlusCircle, LogOut, Trash2, Loader2, MoreVertical, ClipboardList, Shapes, Tag as TagIcon } from 'lucide-react';

export function SharedSpaceClient({ spaceId }: { spaceId: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filters, setFilters] = useState<SharedFilters>(DEFAULT_SHARED_FILTERS);

  const myMembershipRef = useMemoFirebase(() =>
    user ? doc(firestore, `sharedSpaces/${spaceId}/members`, user.uid) : null
  , [firestore, user, spaceId]);
  const { data: myMembership, isLoading: isMembershipLoading } = useDoc<SharedSpaceMember>(myMembershipRef);

  const isMember = !!myMembership;

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const spaceRef = useMemoFirebase(() => (isMember ? doc(firestore, 'sharedSpaces', spaceId) : null), [firestore, spaceId, isMember]);
  const { data: space } = useDoc<SharedSpace>(spaceRef);

  const membersQuery = useMemoFirebase(() =>
    isMember ? collection(firestore, `sharedSpaces/${spaceId}/members`) : null
  , [firestore, spaceId, isMember]);
  const { data: members } = useCollection<SharedSpaceMember>(membersQuery);

  const categoriesQuery = useMemoFirebase(() =>
    isMember ? collection(firestore, `sharedSpaces/${spaceId}/categories`) : null
  , [firestore, spaceId, isMember]);
  const { data: categories } = useCollection<SharedCategory>(categoriesQuery);

  const tagsQuery = useMemoFirebase(() =>
    isMember ? collection(firestore, `sharedSpaces/${spaceId}/tags`) : null
  , [firestore, spaceId, isMember]);
  const { data: tags } = useCollection<SharedTag>(tagsQuery);

  const expensesQuery = useMemoFirebase(() =>
    isMember ? query(collection(firestore, `sharedSpaces/${spaceId}/expenses`), orderBy('date', 'desc')) : null
  , [firestore, spaceId, isMember]);
  const { data: expenses, isLoading: isExpensesLoading } = useCollection<SharedExpense>(expensesQuery);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    const q = filters.searchQuery.toLowerCase();
    return expenses.filter((expense) => {
      if (filters.paidBy.length > 0 && !filters.paidBy.includes(expense.paidByUid)) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(expense.categoryId || '')) return false;
      if (filters.tags.length > 0 && !filters.tags.some((tagId) => expense.tagIds?.includes(tagId))) return false;
      if (q) {
        const descMatch = expense.description?.toLowerCase().includes(q);
        const amountMatch = String(expense.amount).includes(q);
        if (!descMatch && !amountMatch) return false;
      }
      return true;
    });
  }, [expenses, filters]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(spaceId);
    toast({ title: 'Code Copied' });
  };

  const handleLeave = async () => {
    if (!user || !firestore) return;
    setIsLeaving(true);
    try {
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, `sharedSpaces/${spaceId}/members`, user.uid));
      batch.set(doc(firestore, 'users', user.uid), { sharedSpaceIds: arrayRemove(spaceId) }, { merge: true });
      await commitBatchNonBlocking(batch, `sharedSpaces/${spaceId}`);
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
      const [membersSnap, expensesSnap, categoriesSnap, tagsSnap] = await Promise.all([
        getDocs(collection(firestore, `sharedSpaces/${spaceId}/members`)),
        getDocs(collection(firestore, `sharedSpaces/${spaceId}/expenses`)),
        getDocs(collection(firestore, `sharedSpaces/${spaceId}/categories`)),
        getDocs(collection(firestore, `sharedSpaces/${spaceId}/tags`)),
      ]);
      const batch = writeBatch(firestore);
      membersSnap.forEach((d) => batch.delete(d.ref));
      expensesSnap.forEach((d) => batch.delete(d.ref));
      categoriesSnap.forEach((d) => batch.delete(d.ref));
      tagsSnap.forEach((d) => batch.delete(d.ref));
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
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href="/shared"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopyCode} className="gap-2">
          <Copy className="h-4 w-4" /> Copy Code
        </Button>
      </PageHeader>

      <SharedExpensesSummary
        expenses={filteredExpenses}
        members={members || []}
        currentUid={user?.uid}
        currency={userProfile?.defaultCurrency}
        isLoading={isExpensesLoading}
      />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex -space-x-2">
          {(members || []).map((m) => (
            <Avatar key={m.uid} className="h-8 w-8 border-2 border-background">
              <AvatarImage src={m.photoURL || undefined} />
              <AvatarFallback>{(m.displayName || 'M').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <AddSharedExpenseDialog spaceId={spaceId} members={members || []} categories={categories || []} tags={tags || []}>
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" /> Add Expense
            </Button>
          </AddSharedExpenseDialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <CopyPersonalExpensesDialog spaceId={spaceId} categories={categories || []} tags={tags || []}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <ClipboardList className="mr-2 h-4 w-4" /> Copy from Personal
                </DropdownMenuItem>
              </CopyPersonalExpensesDialog>
              <ManageSharedTaxonomyDialog spaceId={spaceId} kind="categories">
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Shapes className="mr-2 h-4 w-4" /> Manage Categories
                </DropdownMenuItem>
              </ManageSharedTaxonomyDialog>
              <ManageSharedTaxonomyDialog spaceId={spaceId} kind="tags">
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <TagIcon className="mr-2 h-4 w-4" /> Manage Tags
                </DropdownMenuItem>
              </ManageSharedTaxonomyDialog>
            </DropdownMenuContent>
          </DropdownMenu>

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

      <SharedExpensesFilters
        filters={filters}
        onFiltersChange={setFilters}
        members={members || []}
        categories={categories || []}
        tags={tags || []}
        currentUid={user?.uid}
      />

      <SharedExpensesList
        expenses={filteredExpenses}
        members={members || []}
        categories={categories || []}
        tags={tags || []}
        currentUid={user?.uid}
        currency={userProfile?.defaultCurrency}
        isLoading={isExpensesLoading}
      />
    </div>
  );
}
