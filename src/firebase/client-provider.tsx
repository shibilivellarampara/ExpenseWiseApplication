'use client';

import React, { useState, useEffect, useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseSDKs {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [sdks, setSdks] = useState<FirebaseSDKs | null>(null);

  useEffect(() => {
    // initializeFirebase now runs only on the client after mount.
    const firebaseSdks = initializeFirebase();
    if (firebaseSdks.firebaseApp && firebaseSdks.auth && firebaseSdks.firestore) {
        setSdks(firebaseSdks as FirebaseSDKs);
    }
  }, []);


  // While the SDKs are initializing, we can show a loading state or return null.
  // This prevents children from rendering and trying to access a null context.
  if (!sdks) {
    // You can replace this with a proper loading spinner component if you have one
    return null; 
  }

  return (
    <FirebaseProvider
      firebaseApp={sdks.firebaseApp}
      auth={sdks.auth}
      firestore={sdks.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
