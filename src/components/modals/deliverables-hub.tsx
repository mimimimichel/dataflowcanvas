'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, FileJson, FileSpreadsheet, FileCode, Database, Workflow, Package,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type DeliverableId =
  | 'functional-spec' | 'product-spec' | 'mission-spec'
  | 'pyspark' | 'dbt' | 'ontology' | 'pipeline-config';

interface DeliverableCard {
  id: DeliverableId;
  title: string;
  description: string;
  format: string;
  icon: LucideIcon;
  iconColor: string;
}

const DOCUMENTS: DeliverableCard[] = [
  {
    id: 'functional-spec',
    title: 'Spec fonctionnelle',
    description: "Document Markdown rédigé par l'IA à partir du canvas, pour revue métier.",
    format: 'Markdown · IA',
    icon: Sparkles,
    iconColor: 'text-amber-500',
  },
  {
    id: 'product-spec',
    title: 'Spec data product',
    description: 'YAML unifié ODPS / DPDS / BITOL : gouvernance, contrats, classification.',
    format: 'YAML · IA',
    icon: FileJson,
    iconColor: 'text-sky-500',
  },
  {
    id: 'mission-spec',
    title: 'Classeur de mission',
    description: 'Spec pipeline Foundry (9 onglets) pré-remplie depuis le canvas — le livrable client.',
    format: '.xlsx',
    icon: FileSpreadsheet,
    iconColor: 'text-emerald-500',
  },
];

const CODE: DeliverableCard[] = [
  {
    id: 'pyspark',
    title: 'PySpark / Foundry',
    description: 'Transform @transform_df prêt à coller dans un repo Foundry.',
    format: '.py',
    icon: FileCode,
    iconColor: 'text-amber-500',
  },
  {
    id: 'dbt',
    title: 'Projet dbt',
    description: 'sources.yml, un modèle SQL par étape, schema.yml avec tests.',
    format: '.sql / .yml',
    icon: Database,
    iconColor: 'text-orange-500',
  },
  {
    id: 'ontology',
    title: 'Ontologie',
    description: 'Définition JSON des objets dérivée des schémas du pipeline.',
    format: '.json',
    icon: FileJson,
    iconColor: 'text-sky-500',
  },
  {
    id: 'pipeline-config',
    title: 'Config pipeline',
    description: 'Configuration JSON du graphe (nodes, dépendances, planification).',
    format: '.json',
    icon: Workflow,
    iconColor: 'text-emerald-500',
  },
];

interface DeliverablesHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: DeliverableId) => void;
}

function CardGrid({ cards, onSelect }: { cards: DeliverableCard[]; onSelect: (id: DeliverableId) => void }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {cards.map(card => (
        <button
          key={card.id}
          onClick={() => onSelect(card.id)}
          className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/10 hover:bg-muted/30 hover:border-primary/40 transition-colors text-left"
        >
          <div className="p-2 rounded-md bg-primary/10 border border-primary/15 shrink-0 mt-0.5">
            <card.icon className={`h-4 w-4 ${card.iconColor}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">{card.title}</p>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono shrink-0">{card.format}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{card.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function DeliverablesHub({ open, onOpenChange, onSelect }: DeliverablesHubProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Livrables</DialogTitle>
              <DialogDescription>
                Tout ce que ce pipeline peut produire — documents pour le métier, code pour la prod.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <div className="space-y-2">
            <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest px-0.5">Documents</h3>
            <CardGrid cards={DOCUMENTS} onSelect={onSelect} />
          </div>
          <div className="space-y-2">
            <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest px-0.5">Code</h3>
            <CardGrid cards={CODE} onSelect={onSelect} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
