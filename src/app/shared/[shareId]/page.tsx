'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useFirestore, getSharedLineage, type SharedLineageSnapshot } from '@/firebase';
import { NODE_WIDTH, estimateNodeHeight } from '@/lib/canvas-layout';
import type { PipelineNode } from '@/lib/pipeline-data';
import { GitBranch, Loader2, Database, GitCompare, Layers, Server, ArrowLeft } from 'lucide-react';

/** Matches the port offset used by the interactive canvas (main-app.tsx) so connectors line up with the same card layout. */
const PORT_Y_OFFSET = 45;

const TYPE_ICON: Record<string, React.ElementType> = {
  source: Database,
  transformation: GitCompare,
  destination: Server,
  dataset: Layers,
};

function SharedNodeCard({ node, left, top }: { node: PipelineNode; left: number; top: number }) {
  const Icon = TYPE_ICON[node.type] || Database;
  const fields = node.type === 'source' ? node.outputFields : node.inputFields;

  return (
    <div className="absolute w-64 rounded-xl border bg-card shadow-sm overflow-hidden" style={{ left, top }}>
      <div className="p-3 border-b flex items-center gap-2">
        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{node.name}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{node.type}</p>
        </div>
      </div>
      {node.description && (
        <p className="px-3 pt-2 text-xs text-muted-foreground line-clamp-2">{node.description}</p>
      )}
      {fields && fields.length > 0 && (
        <div className="p-3 font-mono text-[11px] space-y-1 max-h-40 overflow-y-auto">
          {fields.slice(0, 12).map(f => (
            <div key={f.name} className="flex justify-between gap-2">
              <span className="truncate">{f.name}</span>
              <span className="text-muted-foreground shrink-0">{f.type}</span>
            </div>
          ))}
          {fields.length > 12 && <p className="text-muted-foreground">+{fields.length - 12} more</p>}
        </div>
      )}
    </div>
  );
}

export default function SharedLineagePage() {
  const params = useParams<{ shareId: string }>();
  const firestore = useFirestore();
  // undefined = still loading, null = not found/error
  const [snapshot, setSnapshot] = useState<SharedLineageSnapshot | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getSharedLineage(firestore, params.shareId)
      .then(result => { if (!cancelled) setSnapshot(result); })
      .catch(() => { if (!cancelled) setSnapshot(null); });
    return () => { cancelled = true; };
  }, [firestore, params.shareId]);

  if (snapshot === undefined) {
    return (
      <div className="h-dvh w-full flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Chargement du pipeline partagé…</p>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="h-dvh w-full flex flex-col items-center justify-center gap-3 bg-background text-center px-6">
        <p className="text-lg font-semibold">Ce lien de partage n'existe pas ou plus.</p>
        <p className="text-sm text-muted-foreground">Demandez un nouveau lien à la personne qui l'a partagé.</p>
        <Link href="/" className="text-primary text-sm font-medium hover:underline mt-2">Retour à Theseus</Link>
      </div>
    );
  }

  const padding = 80;
  const bounds = snapshot.nodes.reduce(
    (acc, n) => ({
      minX: Math.min(acc.minX, n.position.x),
      minY: Math.min(acc.minY, n.position.y),
      maxX: Math.max(acc.maxX, n.position.x + NODE_WIDTH),
      maxY: Math.max(acc.maxY, n.position.y + estimateNodeHeight(n)),
    }),
    { minX: 0, minY: 0, maxX: 800, maxY: 600 }
  );
  const contentWidth = bounds.maxX - bounds.minX + padding * 2;
  const contentHeight = bounds.maxY - bounds.minY + padding * 2;
  const toLocal = (x: number, y: number) => ({ x: x - bounds.minX + padding, y: y - bounds.minY + padding });

  return (
    <div className="h-dvh w-full flex flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <GitBranch className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate">{snapshot.name}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Vue en lecture seule · Theseus</p>
          </div>
        </div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline shrink-0">
          <ArrowLeft className="h-3.5 w-3.5" /> Ouvrir Theseus
        </Link>
      </header>

      {snapshot.description && (
        <p className="px-6 py-3 text-sm text-muted-foreground border-b shrink-0">{snapshot.description}</p>
      )}

      <main className="flex-1 overflow-auto canvas-grid">
        {snapshot.nodes.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
            Ce pipeline ne contient aucun nœud pour le moment.
          </div>
        ) : (
          <div className="relative" style={{ width: contentWidth, height: contentHeight }}>
            <svg className="absolute inset-0 pointer-events-none overflow-visible" width="100%" height="100%">
              {snapshot.connectors.map((connector, i) => {
                const fromNode = snapshot.nodes.find(n => n.id === connector.from);
                const toNode = snapshot.nodes.find(n => n.id === connector.to);
                if (!fromNode || !toNode) return null;
                const from = toLocal(fromNode.position.x + NODE_WIDTH, fromNode.position.y + PORT_Y_OFFSET);
                const to = toLocal(toNode.position.x, toNode.position.y + PORT_Y_OFFSET);
                const cp1x = from.x + 80, cp2x = to.x - 80;
                return (
                  <path
                    key={`${connector.from}-${connector.to}-${i}`}
                    d={`M ${from.x} ${from.y} C ${cp1x} ${from.y} ${cp2x} ${to.y} ${to.x} ${to.y}`}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeOpacity={0.4}
                    strokeWidth={2}
                  />
                );
              })}
            </svg>
            {snapshot.nodes.map(node => {
              const pos = toLocal(node.position.x, node.position.y);
              return <SharedNodeCard key={node.id} node={node} left={pos.x} top={pos.y} />;
            })}
          </div>
        )}
      </main>
    </div>
  );
}
