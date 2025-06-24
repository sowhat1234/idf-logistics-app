// Firebase Configuration and Initialization Module
// This file is only needed for Firebase integration (Path B)

import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';

// Firebase configuration interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Environment detection
const isDevelopment = import.meta.env.DEV || import.meta.env.VITE_ENVIRONMENT === 'development';
const isProduction = import.meta.env.PROD || import.meta.env.VITE_ENVIRONMENT === 'production';

// Firebase configuration from environment variables
const firebaseConfig: FirebaseConfig | null = (() => {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  // Check if all required config values are present
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !config[field as keyof typeof config]);

  if (missingFields.length > 0) {
    if (isDevelopment) {
      console.warn(
        '🔥 Firebase configuration incomplete. Missing fields:',
        missingFields.join(', '),
        '\n📝 For Firebase integration (Path B), please configure your .env file with Firebase credentials.',
        '\n🏠 For local development (Path A), you can ignore this warning - the app will use JSON files + localStorage.'
      );
    }
    return null;
  }

  return config;
})();

// Firebase app instance
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// Initialize Firebase services
const initializeFirebase = (): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
  isConfigured: boolean;
} => {
  if (!firebaseConfig) {
    return {
      app: null,
      auth: null,
      db: null,
      storage: null,
      isConfigured: false,
    };
  }

  try {
    // Initialize Firebase app (only if not already initialized)
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      
      if (isDevelopment) {
        console.log('🔥 Firebase app initialized successfully');
      }
    } else {
      app = getApps()[0];
    }

    // Initialize Firebase services
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // Connect to Firebase emulators in development mode
    if (isDevelopment && typeof window !== 'undefined') {
      // Only connect to emulators if not already connected
      try {
        // Auth emulator
          connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
          console.log('🔥 Connected to Firebase Auth emulator');
      } catch (error) {
        // Emulator might not be running or already connected
        console.log('ℹ️ Firebase Auth emulator not available or already connected');
      }

      try {
        // Firestore emulator
          connectFirestoreEmulator(db, 'localhost', 8080);
          console.log('🔥 Connected to Firestore emulator');
      } catch (error) {
        // Emulator might not be running or already connected
        console.log('ℹ️ Firestore emulator not available or already connected');
      }

      try {
        // Storage emulator
        connectStorageEmulator(storage, 'localhost', 9199);
        console.log('🔥 Connected to Firebase Storage emulator');
      } catch (error) {
        // Emulator might not be running or already connected
        console.log('ℹ️ Firebase Storage emulator not available or already connected');
      }
    }

    if (isDevelopment) {
      console.log('🔥 All Firebase services initialized successfully');
    }

    return {
      app,
      auth,
      db,
      storage,
      isConfigured: true,
    };
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error);
    
    if (isDevelopment) {
      console.warn(
        '🔥 Firebase initialization failed. The app will fall back to local data storage.',
        '\n📝 To use Firebase (Path B), please check your .env configuration.',
        '\n🏠 For local development (Path A), you can ignore this error.'
      );
    }

    return {
      app: null,
      auth: null,
      db: null,
      storage: null,
      isConfigured: false,
    };
  }
};

// Initialize Firebase
const { app: firebaseApp, auth: firebaseAuth, db: firebaseDb, storage: firebaseStorage, isConfigured } = initializeFirebase();

// Export Firebase services
export { firebaseApp as app, firebaseAuth as auth, firebaseDb as db, firebaseStorage as storage };

// Export configuration status
export const isFirebaseConfigured = isConfigured;

// Export environment helpers
export const environment = {
  isDevelopment,
  isProduction,
  isFirebaseConfigured: isConfigured,
};

// Export Firebase config for debugging (development only)
export const getFirebaseConfig = (): FirebaseConfig | null => {
  if (isDevelopment) {
    return firebaseConfig;
  }
  return null;
};

// Helper function to check if Firebase is available
export const isFirebaseAvailable = (): boolean => {
  return isConfigured && app !== null && auth !== null && db !== null;
};

// Helper function to get Firebase services with error handling
export const getFirebaseServices = () => {
  if (!isFirebaseAvailable()) {
    throw new Error(
      'Firebase is not configured or available. ' +
      'Please check your environment variables or use local development mode.'
    );
  }

  return {
    app: firebaseApp!,
    auth: firebaseAuth!,
    db: firebaseDb!,
    storage: firebaseStorage!,
  };
};

// Export types for TypeScript support
export type { FirebaseConfig };
export type { FirebaseApp, Auth, Firestore, FirebaseStorage };

// Default export for convenience
export default {
  app: firebaseApp,
  auth: firebaseAuth,
  db: firebaseDb,
  storage: firebaseStorage,
  isConfigured,
  environment,
  isFirebaseAvailable,
  getFirebaseServices,
  getFirebaseConfig,
};