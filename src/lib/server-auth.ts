import { firebaseConfig } from '@/firebase/config';

const LOOKUP_URL = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`;

/**
 * Server-side Firebase ID token verification via the Identity Toolkit REST
 * API — avoids pulling in firebase-admin (which needs a service account)
 * for the only thing these routes need: "is this a signed-in user of this
 * project". Returns the uid, or null for a missing/invalid token.
 */
export async function verifyFirebaseToken(authorizationHeader: string | null): Promise<{ uid: string } | null> {
  const token = authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice(7) : null;
  if (!token) return null;
  try {
    const res = await fetch(LOOKUP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const uid = data.users?.[0]?.localId;
    return uid ? { uid } : null;
  } catch {
    return null;
  }
}
