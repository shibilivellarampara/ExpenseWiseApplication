'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase'; // Use the initialization function

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // useMemo ensures that Firebase is initialized only once per client session.
  const sdks = useMemo(() => initializeFirebase(), []);

  // We are now sure that sdks contains the initialized services if on the client.
  // The check for window object is inside initializeFirebase.
  if (!sdks.firebaseApp || !sdks.auth || !sdks.firestore) {
    // This can happen during server-side rendering, which is expected.
    // The components will not attempt to use firebase on the server.
    return <>{children}</>;
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
