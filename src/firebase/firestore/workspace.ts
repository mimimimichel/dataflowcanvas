'use client';

import { collection, doc, getDocs, type Firestore } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Project, LineageInfo } from '@/lib/pipeline-data';

/**
 * A signed-in user's persisted workspace: their Projects (each embedding its Data
 * Products inline) and their Lineages (each embedding its versions/nodes/connectors/
 * groups inline) — mirrors the exact shape already used in memory, one Firestore
 * document per Project / per Lineage.
 */
export async function loadUserWorkspace(
  firestore: Firestore,
  uid: string
): Promise<{ projects: Project[]; lineages: LineageInfo[] }> {
  const [projectsSnap, lineagesSnap] = await Promise.all([
    getDocs(collection(firestore, 'users', uid, 'projects')),
    getDocs(collection(firestore, 'users', uid, 'lineages')),
  ]);

  const projects = projectsSnap.docs.map(d => ({ ...(d.data() as Omit<Project, 'id'>), id: d.id }));
  const lineages = lineagesSnap.docs.map(d => ({ ...(d.data() as Omit<LineageInfo, 'id'>), id: d.id }));

  return { projects, lineages };
}

export function saveProject(firestore: Firestore, uid: string, project: Project) {
  const { id, ...data } = project;
  setDocumentNonBlocking(doc(firestore, 'users', uid, 'projects', id), data, { merge: false });
}

export function saveLineage(firestore: Firestore, uid: string, lineage: LineageInfo) {
  const { id, ...data } = lineage;
  setDocumentNonBlocking(doc(firestore, 'users', uid, 'lineages', id), data, { merge: false });
}
