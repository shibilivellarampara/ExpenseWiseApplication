
'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
import { registerSW } from '@/app/register-sw';
import { AppLoader } from '@/components/AppLoader';

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
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const firebaseSdks = initializeFirebase();
    if (firebaseSdks.firebaseApp && firebaseSdks.auth && firebaseSdks.firestore && firebaseSdks.storage) {
        setPersistence(firebaseSdks.auth, browserLocalPersistence)
            .then(() => {
                setSdks(firebaseSdks as FirebaseSDKs);
                // First-time auth state check
                const unsubscribe = onAuthStateChanged(firebaseSdks.auth, (user) => {
                    setIsAuthReady(true);
                    unsubscribe(); // Unsubscribe after the first auth state check
                });
            })
            .catch((error) => {
                console.error("Error setting Firebase auth persistence:", error);
                setSdks(firebaseSdks as FirebaseSDKs);
                setIsAuthReady(true); // Mark as ready even if persistence fails
            });
    } else {
        setIsAuthReady(true); // Mark as ready if Firebase isn't configured
    }
  }, []);

  useEffect(() => {
    registerSW();
  }, []);

  if (!sdks || !isAuthReady) {
    // Show a loader while Firebase and Auth state are initializing
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <AppLoader message="Connecting..." />
        </div>
    );
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
