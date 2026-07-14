'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, FileText, Workflow, Trash2, Plus, ExternalLink } from 'lucide-react';
import {
  Project, DataProduct, LineageInfo, DataProductDocumentation,
  PipelineCriticality, PipelineSensitivity, AdrEntry, RunbookEntry, DocVersionEntry, DocLink,
} from '@/lib/pipeline-data';
import { EntryListEditor } from '@/components/shared/entry-list-editor';
import LineageDashboard from '@/components/dashboard/lineage-dashboard';

interface DataProductDetailProps {
  project: Project;
  dataProduct: DataProduct;
  lineages: LineageInfo[];
  onBack: () => void;
  onDocumentationChange: (doc: DataProductDocumentation) => void;
  onSelectLineage: (id: string) => void;
  onCreateLineage: (name: string, description: string) => void;
}

const CRITICALITY_OPTIONS: PipelineCriticality[] = ['Vitale', 'Haute', 'Moyenne', 'Basse'];
const SENSITIVITY_OPTIONS: PipelineSensitivity[] = ['Aucune', 'Interne', 'Confidentiel', 'Données personnelles (RGPD)'];

export default function DataProductDetail({
  project, dataProduct, lineages, onBack, onDocumentationChange, onSelectLineage, onCreateLineage,
}: DataProductDetailProps) {
  const doc = dataProduct.documentation;
  const scopedLineages = lineages.filter(l => dataProduct.lineageIds.includes(l.id));

  const updateCard = (patch: Partial<DataProductDocumentation['identityCard']>) => {
    onDocumentationChange({ ...doc, identityCard: { ...doc.identityCard, ...patch } });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" /> {project.name}
          </Button>
          <div className="space-y-1">
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{dataProduct.name}</h2>
            <p className="text-muted-foreground text-lg">{dataProduct.description}</p>
          </div>
        </div>

        <Tabs defaultValue="documentation" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="documentation" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Documentation</TabsTrigger>
            <TabsTrigger value="pipelines" className="gap-1.5"><Workflow className="h-3.5 w-3.5" /> Pipelines ({scopedLineages.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="documentation" className="space-y-8">
            <section className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Overview</h3>
              <Textarea
                className="min-h-[120px] text-sm"
                placeholder="What is this data product, who is it for, what problem does it solve..."
                value={doc.overview}
                onChange={(e) => onDocumentationChange({ ...doc, overview: e.target.value })}
              />
            </section>

            <Separator />

            <section className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Identity Card</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Owner (ONE person)</Label>
                  <Input className="h-9 text-sm" value={doc.identityCard.owner || ''} onChange={(e) => updateCard({ owner: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Backup contact</Label>
                  <Input className="h-9 text-sm" value={doc.identityCard.backupContact || ''} onChange={(e) => updateCard({ backupContact: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Criticality</Label>
                  <Select value={doc.identityCard.criticality} onValueChange={(v) => updateCard({ criticality: v as PipelineCriticality })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose..." /></SelectTrigger>
                    <SelectContent>{CRITICALITY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Global sensitivity</Label>
                  <Select value={doc.identityCard.sensitivity} onValueChange={(v) => updateCard({ sensitivity: v as PipelineSensitivity })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose..." /></SelectTrigger>
                    <SelectContent>{SENSITIVITY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 grid gap-1.5">
                  <Label className="text-xs">Downstream consumers</Label>
                  <Input className="h-9 text-sm" placeholder="e.g. Planning app, quality dashboard, ERP export" value={doc.identityCard.downstreamConsumers || ''} onChange={(e) => updateCard({ downstreamConsumers: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Freshness SLA</Label>
                  <Input className="h-9 text-sm" placeholder="e.g. J-1 available by 6am CET" value={doc.identityCard.freshnessSla || ''} onChange={(e) => updateCard({ freshnessSla: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Expected availability window</Label>
                  <Input className="h-9 text-sm" value={doc.identityCard.availabilityWindow || ''} onChange={(e) => updateCard({ availabilityWindow: e.target.value })} />
                </div>
                <div className="col-span-2 grid gap-1.5">
                  <Label className="text-xs">Foundry environment</Label>
                  <Input className="h-9 text-sm" placeholder="e.g. project space /Prod/Maintenance" value={doc.identityCard.foundryEnvironment || ''} onChange={(e) => updateCard({ foundryEnvironment: e.target.value })} />
                </div>
                <div className="col-span-2 grid gap-1.5">
                  <Label className="text-xs">Last validated</Label>
                  <Input className="h-9 text-sm" placeholder="DD/MM/YYYY — by whom" value={doc.identityCard.lastValidatedAt || ''} onChange={(e) => updateCard({ lastValidatedAt: e.target.value })} />
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Links</h3>
              <div className="space-y-2">
                {doc.links.map((link, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Input
                      className="h-9 text-sm sm:w-40 shrink-0"
                      placeholder="Label"
                      value={link.label}
                      onChange={(e) => {
                        const next = doc.links.slice();
                        next[idx] = { ...next[idx], label: e.target.value };
                        onDocumentationChange({ ...doc, links: next });
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        className="h-9 text-sm flex-1 min-w-0"
                        placeholder="https://..."
                        value={link.url}
                        onChange={(e) => {
                          const next = doc.links.slice();
                          next[idx] = { ...next[idx], url: e.target.value };
                          onDocumentationChange({ ...doc, links: next });
                        }}
                      />
                      {link.url && (
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" asChild>
                          <a href={link.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => onDocumentationChange({ ...doc, links: doc.links.filter((_, i) => i !== idx) })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline" size="sm" className="gap-1.5"
                  onClick={() => onDocumentationChange({ ...doc, links: [...doc.links, { label: '', url: '' } satisfies DocLink] })}
                >
                  <Plus className="h-3.5 w-3.5" /> Add a link
                </Button>
              </div>
            </section>

            <Separator />

            <section className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Decision Log (ADR)</h3>
              <EntryListEditor<AdrEntry>
                entries={doc.adrs}
                onChange={(adrs) => onDocumentationChange({ ...doc, adrs })}
                emptyLabel="No decisions logged yet. Three lines per decision is usually enough."
                newEntry={() => ({ id: `ADR-${String(doc.adrs.length + 1).padStart(3, '0')}`, date: '', decision: '', context: '', alternatives: '', deciders: '', impact: '' })}
                fields={[
                  { key: 'id', label: 'ADR-#' },
                  { key: 'date', label: 'Date' },
                  { key: 'decision', label: 'Decision', multiline: true },
                  { key: 'context', label: 'Context', multiline: true },
                  { key: 'alternatives', label: 'Alternative(s) rejected', multiline: true },
                  { key: 'deciders', label: 'Decision maker(s)' },
                  { key: 'impact', label: 'Impact if revisited', multiline: true },
                ]}
              />
            </section>

            <Separator />

            <section className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Runbook</h3>
              <EntryListEditor<RunbookEntry>
                entries={doc.runbook}
                onChange={(runbook) => onDocumentationChange({ ...doc, runbook })}
                emptyLabel="No failure modes documented yet."
                newEntry={() => ({ id: `R${doc.runbook.length + 1}`, scenario: '', symptom: '', diagnosis: '', procedure: '', backfill: '', recoveryDuration: '', escalation: '' })}
                fields={[
                  { key: 'id', label: '#' },
                  { key: 'scenario', label: 'Failure scenario' },
                  { key: 'symptom', label: 'Observable symptom', multiline: true },
                  { key: 'diagnosis', label: 'Diagnosis', multiline: true },
                  { key: 'procedure', label: 'Recovery procedure (numbered steps)', multiline: true },
                  { key: 'backfill', label: 'How to backfill if needed', multiline: true },
                  { key: 'recoveryDuration', label: 'Estimated recovery time' },
                  { key: 'escalation', label: 'Escalation' },
                ]}
              />
            </section>

            <Separator />

            <section className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Version History</h3>
              <EntryListEditor<DocVersionEntry>
                entries={doc.versions}
                onChange={(versions) => onDocumentationChange({ ...doc, versions })}
                emptyLabel="No history entries yet."
                newEntry={() => ({ version: '', date: '', author: '', changes: '', validatedBy: '' })}
                fields={[
                  { key: 'version', label: 'Version' },
                  { key: 'date', label: 'Date' },
                  { key: 'author', label: 'Author' },
                  { key: 'changes', label: 'Changes', multiline: true },
                  { key: 'validatedBy', label: 'Validated by (business / tech)' },
                ]}
              />
            </section>
          </TabsContent>

          <TabsContent value="pipelines">
            <LineageDashboard lineages={scopedLineages} onSelectLineage={onSelectLineage} onCreateLineage={onCreateLineage} compact />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
