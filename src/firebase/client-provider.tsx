'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseSDKs {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [sdks, setSdks] = useState<FirebaseSDKs | null>(null);

  useEffect(() => {
    const firebaseSdks = initializeFirebase();
    if (firebaseSdks.firebaseApp && firebaseSdks.auth && firebaseSdks.firestore && firebaseSdks.storage) {
        setSdks(firebaseSdks as FirebaseSDKs);
    }
  }, []);

  if (!sdks) {
    return null;
  }

  return (
    <FirebaseProvider
      firebaseApp={sdks.firebaseApp}
      auth={sdks.auth}
      firestore={sdks.firestore}
      storage={sdks.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
