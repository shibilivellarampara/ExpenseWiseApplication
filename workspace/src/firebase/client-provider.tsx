
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
                // The onAuthStateChanged listener in FirebaseProvider will handle setting the user.
                // We just need to wait for the very first auth state to be determined.
                const unsubscribe = onAuthStateChanged(firebaseSdks.auth, (user) => {
                    setIsAuthReady(true);
                    unsubscribe(); // We only need to know when the initial check is done.
                });
            })
            .catch((error) => {
                console.error("Error setting Firebase auth persistence:", error);
                // Still set sdks and mark as ready to not block the app on persistence failure.
                setSdks(firebaseSdks as FirebaseSDKs);
                setIsAuthReady(true);
            });
    } else {
        // If Firebase isn't configured, we can proceed without it.
        setIsAuthReady(true);
    }
  }, []);

  useEffect(() => {
    registerSW();
  }, []);

  // Show a loader until both Firebase SDKs are initialized AND the initial auth state is resolved.
  if (!sdks || !isAuthReady) {
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
