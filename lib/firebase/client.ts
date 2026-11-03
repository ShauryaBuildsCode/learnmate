import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";

/**
 * The Firebase web app registered for this project. The values are public identifiers (they ship to every browser by
 * design), read from NEXT_PUBLIC_FIREBASE_* variables. Nothing in LearnMate depends on a Firebase service yet:
 * Supabase handles auth and data. This is the one place to start from when a Firebase product (Analytics, Messaging,
 * App Check...) is added.
 */
export function firebaseConfig(): FirebaseOptions | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !projectId || !appId) return null;
  return {
    apiKey,
    projectId,
    appId,
    authDomain: `${projectId}.firebaseapp.com`,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

/** The initialised Firebase app, or null when no web config is set (so the app still runs without Firebase). */
export function getFirebaseApp(): FirebaseApp | null {
  const config = firebaseConfig();
  if (!config) return null;
  return getApps().length ? getApp() : initializeApp(config);
}
