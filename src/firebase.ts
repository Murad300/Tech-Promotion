import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { getDatabase, ref, set as rtdbSet, remove as rtdbRemove, get as rtdbGet } from 'firebase/database';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || "AIzaSyCuqn0W4lbTona95UEmgGS_V9gS0hiDzkg",
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || "smart-bd24.firebaseapp.com",
  databaseURL: (import.meta as any).env.VITE_FIREBASE_DATABASE_URL || "https://smart-bd24-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "smart-bd24",
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || "smart-bd24.firebasestorage.app",
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || "642015758509",
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || "1:642015758509:web:60d1309d11b5f1f9be1e24"
};

// Initialize Firebase App gracefully
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize services with try/catch to prevent module load-time crashes if services aren't active
let db: any = null;
let rtdb: any = null;
let auth: any = null;

try {
  db = getFirestore(app);
} catch (e) {
  console.warn("Firestore initialization deferred or failed:", e);
}

try {
  rtdb = getDatabase(app);
} catch (e) {
  console.warn("Realtime Database initialization deferred or failed:", e);
}

try {
  auth = getAuth(app);
} catch (e) {
  console.warn("Auth initialization failed:", e);
}

export { db, rtdb, auth };

// Firestore Error Types
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null, // Simple fallback as Auth is not configured here
      email: null,
      emailVerified: null,
      isAnonymous: null
    },
    operationType,
    path
  };
  console.error('Firestore Error Details:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

// Check database connection
export async function testConnection(): Promise<{ firestore: boolean; rtdb: boolean }> {
  let firestoreConnected = false;
  let rtdbConnected = false;

  if (db) {
    try {
      // Try to connect to 'test' collection
      await getDocFromServer(doc(db, 'test', 'connection'));
      firestoreConnected = true;
    } catch (error) {
      console.log("Firestore connection test result: standard offline or pending activation");
      // If error is just missing/permissions, the server is reachable
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('permissions') || msg.includes('not-found') || !msg.includes('client is offline')) {
        firestoreConnected = true;
      }
    }
  }

  if (rtdb) {
    try {
      const snapshot = await rtdbGet(ref(rtdb, '.info/connected'));
      rtdbConnected = snapshot.val() === true;
    } catch (e) {
      console.log("RTDB connection test result:", e);
    }
  }

  return { firestore: firestoreConnected, rtdb: rtdbConnected };
}
