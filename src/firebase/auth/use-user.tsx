
'use client';

import { useFirebase } from '@/firebase/provider';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/lib/types';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';


export interface UseUserResult {
  user: User | null;
  userProfile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export function useUser_DEPRECATED(): UseUserResult {
  const { user, isUserLoading, userError } = useFirebase();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  return { 
    user, 
    userProfile, 
    isUserLoading: isUserLoading || isProfileLoading, 
    userError 
  };
}
