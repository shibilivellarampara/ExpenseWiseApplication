"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { deleteCookie, setCookie } from 'cookies-next';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  rawUser: User | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  rawUser: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [rawUser, setRawUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setRawUser(firebaseUser);
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userProfile = { uid: firebaseUser.uid, ...userDoc.data() } as UserProfile;
          setUser(userProfile);
          setCookie('user-session', JSON.stringify(userProfile), { maxAge: 60 * 60 * 24 });
        } else {
          // If user exists in auth but not firestore, create it
          const newUserProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          };
          // This case should be handled in signup, but as a fallback:
          // await setDoc(userDocRef, newUserProfile);
          setUser(newUserProfile);
          setCookie('user-session', JSON.stringify(newUserProfile), { maxAge: 60 * 60 * 24 });
        }
      } else {
        setUser(null);
        setRawUser(null);
        deleteCookie('user-session');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, rawUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
