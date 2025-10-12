'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
    if (!isLoading) {
      if (!user || !userProfile?.isAdmin) {
        router.replace('/dashboard');
      }
    }
  }, [user, userProfile, isLoading, router]);

  if (isLoading || !userProfile?.isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
      <AdminGuard>
        {children}
      </AdminGuard>
  );
}
