import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

function getFirebaseConfig(): FirebaseConfig {
  // Prefer Expo public env var for apiKey (matches legacy), fallback to app.json extra if present.
  const apiKey =
    process.env.EXPO_PUBLIC_API_KEY ??
    (Constants.expoConfig?.extra?.EXPO_PUBLIC_API_KEY as string | undefined) ??
    '';

  if (!apiKey) {
    // Keep this as a runtime error so it’s obvious during dev.
    throw new Error(
      'Missing Firebase apiKey. Set EXPO_PUBLIC_API_KEY in your environment (or app.json extra).'
    );
  }

  // Legacy project values (applimpieza-1e5d0)
  return {
    apiKey,
    authDomain: 'applimpieza-1e5d0.firebaseapp.com',
    projectId: 'applimpieza-1e5d0',
    storageBucket: 'applimpieza-1e5d0.appspot.com',
    messagingSenderId: '667447022124',
    appId: Platform.select({
      // Android app id from google-services.json in this repo
      android: '1:667447022124:android:3a22313cb4ff591c01b789',
      // Web app id from legacy firebase-config.js
      default: '1:667447022124:web:6c9d8868afa5c86b01b789',
    })!,
    measurementId: 'G-GVFZGZLQB4',
  };
}

export const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(getFirebaseConfig());

// Auth: initializeAuth only on native; on web it throws if called twice and persistence differs.
export const auth: Auth = (() => {
  if (Platform.OS === 'web') return getAuth(firebaseApp);

  // If auth was already initialized (Fast Refresh), getAuth will return it.
  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(firebaseApp);
  }
})();

export const db: Firestore = getFirestore(firebaseApp);

