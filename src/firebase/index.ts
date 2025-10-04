'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

let firebaseApp: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

export function initializeFirebase() {
  if (typeof window !== 'undefined') {
    if (!getApps().length) {
      try {
        firebaseApp = initializeApp();
      } catch (e) {
        if (process.env.NODE_ENV === 'production') {
          console.warn(
            'Automatic initialization failed. Falling back to firebase config object.',
            e
          );
        }
        firebaseApp = initializeApp(firebaseConfig);
      }
      auth = getAuth(firebaseApp);
      firestore = getFirestore(firebaseApp);
    } else {
      firebaseApp = getApp();
      auth = getAuth(firebaseApp);
      firestore = getFirestore(firebaseApp);
    }
  }

  return { firebaseApp, auth, firestore };
}

export function getSdks() {
  if (!firebaseApp || !auth || !firestore) {
    initializeFirebase();
  }
  return {
    firebaseApp: firebaseApp!,
    auth: auth!,
    firestore: firestore!,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
