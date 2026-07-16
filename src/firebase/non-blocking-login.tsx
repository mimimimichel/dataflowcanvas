'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  // Assume getAuth and app are initialized elsewhere
} from 'firebase/auth';

/**
 * Initiate anonymous sign-in. Auth state change is handled by the
 * onAuthStateChanged listener, but the returned promise still rejects on
 * failure (wrong password, unauthorized domain, network error, ...) so
 * callers can surface that to the user instead of failing silently.
 */
export function initiateAnonymousSignIn(authInstance: Auth) {
  return signInAnonymously(authInstance);
}

/** Initiate email/password sign-up — see initiateAnonymousSignIn for the error-handling contract. */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string) {
  return createUserWithEmailAndPassword(authInstance, email, password);
}

/** Initiate email/password sign-in — see initiateAnonymousSignIn for the error-handling contract. */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string) {
  return signInWithEmailAndPassword(authInstance, email, password);
}
