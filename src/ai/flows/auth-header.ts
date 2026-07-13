'use client';

import { getAuth } from 'firebase/auth';

/** Authorization header for the AI API routes — empty when not signed in (the server answers 401). */
export async function aiAuthHeaders(): Promise<Record<string, string>> {
  try {
    const token = await getAuth().currentUser?.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
