'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  PipelineNode, Connector, DataProductDocumentation, PipelineCriticality, PipelineSensitivity,
  AdrEntry, RunbookEntry, DocVersionEntry,
} from '@/lib/pipeline-data';
import { generateMissionSpecWorkbook } from '@/lib/mission-spec-generator';
import { EntryListEditor } from '@/components/shared/entry-list-editor';

interface MissionSpecModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineName: string;
  nodes: PipelineNode[];
  connectors: Connector[];
  metadata: DataProductDocumentation;
  onMetadataChange: (metadata: DataProductDocumentation) => void;
}

const CRITICALITY_OPTIONS: PipelineCriticality[] = ['Vitale', 'Haute', 'Moyenne', 'Basse'];
const SENSITIVITY_OPTIONS: PipelineSensitivity[] = ['Aucune', 'Interne', 'Confidentiel', 'Données personnelles (RGPD)'];

export default function MissionSpecModal({
  isOpen, onClose, pipelineName, nodes, connectors, metadata, onMetadataChange,
}: MissionSpecModalProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const updateCard = (patch: Partial<DataProductDocumentation['identityCard']>) => {
    onMetadataChange({ ...metadata, identityCard: { ...metadata.identityCard, ...patch } });
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const buffer = await generateMissionSpecWorkbook(pipelineName, nodes, connectors, metadata);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spec-pipeline-${pipelineName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Classeur généré', description: 'Sources, Destinations, Mapping, Étapes et Qualité sont pré-remplis depuis le canvas.' });
    } catch (error) {
      toast({ title: 'Échec de la génération', description: String(error), variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Mission Spec (Foundry)</DialogTitle>
              <DialogDescription>
                Sources, Destinations, Mapping, Étapes et Qualité sont dérivés du canvas. Complétez le reste ici avant export.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="identity" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-4 shrink-0">
            <TabsTrigger value="identity" className="text-xs">Carte d'identité</TabsTrigger>
            <TabsTrigger value="adr" className="text-xs">ADR ({metadata.adrs.length})</TabsTrigger>
            <TabsTrigger value="runbook" className="text-xs">Runbook ({metadata.runbook.length})</TabsTrigger>
            <TabsTrigger value="versions" className="text-xs">Versions ({metadata.versions.length})</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-3">
            <TabsContent value="identity" className="space-y-3 pr-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Finalité (une phrase)</Label>
                <Textarea className="text-xs" value={metadata.identityCard.purpose || ''} onChange={(e) => updateCard({ purpose: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Propriétaire (UNE personne)</Label>
                  <Input className="h-8 text-xs" value={metadata.identityCard.owner || ''} onChange={(e) => updateCard({ owner: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Contact de secours</Label>
                  <Input className="h-8 text-xs" value={metadata.identityCard.backupContact || ''} onChange={(e) => updateCard({ backupContact: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Criticité</Label>
                  <Select value={metadata.identityCard.criticality} onValueChange={(v) => updateCard({ criticality: v as PipelineCriticality })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>{CRITICALITY_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Sensibilité globale</Label>
                  <Select value={metadata.identityCard.sensitivity} onValueChange={(v) => updateCard({ sensitivity: v as PipelineSensitivity })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>{SENSITIVITY_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Consommateurs en aval</Label>
                <Input className="h-8 text-xs" placeholder="ex. App planification, dashboard qualité, export ERP" value={metadata.identityCard.downstreamConsumers || ''} onChange={(e) => updateCard({ downstreamConsumers: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Engagement de fraîcheur (SLA)</Label>
                  <Input className="h-8 text-xs" placeholder="ex. Données à J-1 disponibles à 6h00 CET" value={metadata.identityCard.freshnessSla || ''} onChange={(e) => updateCard({ freshnessSla: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Fenêtre de disponibilité attendue</Label>
                  <Input className="h-8 text-xs" value={metadata.identityCard.availabilityWindow || ''} onChange={(e) => updateCard({ availabilityWindow: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Environnement Foundry</Label>
                <Input className="h-8 text-xs" placeholder="ex. espace projet /Prod/Maintenance" value={metadata.identityCard.foundryEnvironment || ''} onChange={(e) => updateCard({ foundryEnvironment: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Lien — repo de code</Label>
                  <Input className="h-8 text-xs" value={metadata.identityCard.links?.repo || ''} onChange={(e) => updateCard({ links: { ...metadata.identityCard.links, repo: e.target.value } })} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Lien — lineage</Label>
                  <Input className="h-8 text-xs" value={metadata.identityCard.links?.lineage || ''} onChange={(e) => updateCard({ links: { ...metadata.identityCard.links, lineage: e.target.value } })} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Lien — schedule(s)</Label>
                  <Input className="h-8 text-xs" value={metadata.identityCard.links?.schedule || ''} onChange={(e) => updateCard({ links: { ...metadata.identityCard.links, schedule: e.target.value } })} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Lien — health checks</Label>
                  <Input className="h-8 text-xs" value={metadata.identityCard.links?.healthChecks || ''} onChange={(e) => updateCard({ links: { ...metadata.identityCard.links, healthChecks: e.target.value } })} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Date de dernière validation de ce document</Label>
                <Input className="h-8 text-xs" placeholder="JJ/MM/AAAA — par qui" value={metadata.identityCard.lastValidatedAt || ''} onChange={(e) => updateCard({ lastValidatedAt: e.target.value })} />
              </div>
            </TabsContent>

            <TabsContent value="adr" className="pr-3">
              <EntryListEditor<AdrEntry>
                entries={metadata.adrs}
                onChange={(adrs) => onMetadataChange({ ...metadata, adrs })}
                emptyLabel="Aucune décision consignée. Trois lignes par décision suffisent."
                newEntry={() => ({ id: `ADR-${String(metadata.adrs.length + 1).padStart(3, '0')}`, date: '', decision: '', context: '', alternatives: '', deciders: '', impact: '' })}
                fields={[
                  { key: 'id', label: 'ADR-#' },
                  { key: 'date', label: 'Date' },
                  { key: 'decision', label: 'Décision', multiline: true },
                  { key: 'context', label: 'Contexte', multiline: true },
                  { key: 'alternatives', label: 'Alternative(s) écartée(s)', multiline: true },
                  { key: 'deciders', label: 'Décideur(s)' },
                  { key: 'impact', label: 'Impact si remise en cause', multiline: true },
                ]}
              />
            </TabsContent>

            <TabsContent value="runbook" className="pr-3">
              <EntryListEditor<RunbookEntry>
                entries={metadata.runbook}
                onChange={(runbook) => onMetadataChange({ ...metadata, runbook })}
                emptyLabel="Aucun mode de défaillance documenté. Test du 3h du matin : un inconnu doit pouvoir diagnostiquer et relancer avec cette feuille seule."
                newEntry={() => ({ id: `R${metadata.runbook.length + 1}`, scenario: '', symptom: '', diagnosis: '', procedure: '', backfill: '', recoveryDuration: '', escalation: '' })}
                fields={[
                  { key: 'id', label: '#' },
                  { key: 'scenario', label: 'Scénario de défaillance' },
                  { key: 'symptom', label: 'Symptôme observable', multiline: true },
                  { key: 'diagnosis', label: 'Diagnostic', multiline: true },
                  { key: 'procedure', label: 'Procédure de reprise (étapes numérotées)', multiline: true },
                  { key: 'backfill', label: 'Comment backfiller si besoin', multiline: true },
                  { key: 'recoveryDuration', label: 'Durée de reprise estimée' },
                  { key: 'escalation', label: 'Escalade' },
                ]}
              />
            </TabsContent>

            <TabsContent value="versions" className="pr-3">
              <EntryListEditor<DocVersionEntry>
                entries={metadata.versions}
                onChange={(versions) => onMetadataChange({ ...metadata, versions })}
                emptyLabel="Aucune entrée d'historique."
                newEntry={() => ({ version: '', date: '', author: '', changes: '', validatedBy: '' })}
                fields={[
                  { key: 'version', label: 'Version' },
                  { key: 'date', label: 'Date' },
                  { key: 'author', label: 'Auteur' },
                  { key: 'changes', label: 'Changements', multiline: true },
                  { key: 'validatedBy', label: 'Validé par (métier / tech)' },
                ]}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button onClick={handleDownload} disabled={isGenerating} className="gap-1.5">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Générer & télécharger le .xlsx
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
