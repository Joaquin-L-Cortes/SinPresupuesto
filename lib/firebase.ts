// lib/firebase.ts
// Firebase se mantiene SOLO para: Firestore (LibretaModal, AvanceModal, global_notifications)
// y FCM (ClassNotifier). La autenticación ya no usa Firebase — usa Supabase.
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? "placeholder",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? "placeholder",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ?? "placeholder",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? "placeholder",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "placeholder",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ?? "placeholder",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
// ADMIN_UID eliminado — usar profile.role === 'admin' en su lugar.
