/// <reference types="vite/client" />

declare module 'firebase/app' {
  export interface FirebaseApp {
    name: string;
    options: Record<string, unknown>;
  }
  export function initializeApp(options: Record<string, unknown>): FirebaseApp;
  export function getApps(): FirebaseApp[];
  export function getApp(): FirebaseApp;
}

declare module 'firebase/auth' {
  export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    getIdToken(forceRefresh?: boolean): Promise<string>;
  }
  export interface Auth {
    currentUser: User | null;
    languageCode: string;
    signOut(): Promise<void>;
    onAuthStateChanged(nextOrObserver: (user: User | null) => void): () => void;
  }
  export class GoogleAuthProvider {
    setCustomParameters(customOAuthParameters: Record<string, string>): void;
  }
  export function getAuth(app?: any): Auth;
  export function signInWithPopup(auth: Auth, provider: GoogleAuthProvider): Promise<{ user: User }>;
  export function signOut(auth: Auth): Promise<void>;
  export function onAuthStateChanged(auth: Auth, callback: (user: User | null) => void): () => void;
}
