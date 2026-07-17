'use client';

import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { PipelineNode, Connector, NodeGroup } from '@/lib/pipeline-data';

/**
 * A read-only, point-in-time snapshot of a lineage's active version, published to
 * a public collection so it can be viewed via a link without the viewer needing
 * an account or owner access to the owner's private users/{uid}/lineages data.
 * Re-publishing overwrites the previous snapshot for that lineage — one stable
 * link per lineage, not a new one per click.
 */
export interface SharedLineageSnapshot {
  ownerId: string;
  name: string;
  description?: string;
  nodes: PipelineNode[];
  connectors: Connector[];
  groups: NodeGroup[];
  sharedAt: string;
}

export function publishSharedLineage(
  firestore: Firestore,
  uid: string,
  lineageId: string,
  snapshot: Omit<SharedLineageSnapshot, 'ownerId' | 'sharedAt'>
) {
  return setDocumentNonBlocking(
    doc(firestore, 'shared_lineages', lineageId),
    { ...snapshot, ownerId: uid, sharedAt: new Date().toISOString() },
    { merge: false }
  );
}

export async function getSharedLineage(firestore: Firestore, shareId: string): Promise<SharedLineageSnapshot | null> {
  const snap = await getDoc(doc(firestore, 'shared_lineages', shareId));
  if (!snap.exists()) return null;
  return snap.data() as SharedLineageSnapshot;
}
