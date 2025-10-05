'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/firebase/provider'; // Use the hook from the provider
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { setCookie, deleteCookie } from 'cookies-next';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';


export interface UseUserResult {
  user: User | null;
  userProfile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/**
 * DEPRECATED: Please use the useUser hook exported from the root /firebasebarrel file instead.
 * 
 * React hook to get the current authenticated user.
 * It also fetches the user's profile from Firestore.
 * 
 * @returns {UseUserResult} Object with user, userProfile, isLoading, and error.
 */
export function useUser_DEPRECATED(): UseUserResult {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          if (firebaseUser) {
            setUser(firebaseUser);
            // In a real app, you would get a custom token from your server
            // For this example, we'll store a simplified session object
            const session = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            }
            setCookie('user-session', JSON.stringify(session), { maxAge: 60 * 60 * 24 });
          } else {
            setUser(null);
            deleteCookie('user-session');
          }
        } catch (e: any) {
          setError(e);
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        setError(error);
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth]);

  return { user, userProfile, isUserLoading: isLoading, userError: error };
}
