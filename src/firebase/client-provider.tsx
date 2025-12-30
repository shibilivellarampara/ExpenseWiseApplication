
'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
import { registerSW } from '@/app/register-sw';

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
        // Explicitly set persistence here to ensure user stays logged in
        setPersistence(firebaseSdks.auth, browserLocalPersistence)
            .then(() => {
                setSdks(firebaseSdks as FirebaseSDKs);
            })
            .catch((error) => {
                console.error("Error setting Firebase auth persistence:", error);
                // Still set SDKs even if persistence fails, to not block the app
                setSdks(firebaseSdks as FirebaseSDKs);
            });
    }
  }, []);

  useEffect(() => {
    registerSW();
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
