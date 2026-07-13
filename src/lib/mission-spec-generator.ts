import ExcelJS from 'exceljs';
import {
  PipelineNode, Connector, MissionSpecMetadata, Field, PipelineSensitivity,
} from './pipeline-data';
import {
  describeOperationRule, describeNullHandling, describeDedupRule, isQualityOperation, operationControlType,
} from './operation-description';

const NAVY = 'FF1F3864';
const WHITE = 'FFFFFFFF';
const GRAY = 'FF808080';

function styleTitle(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.font = { bold: true, color: { argb: NAVY }, size: 14 };
}

function styleSubtitle(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.font = { color: { argb: GRAY }, italic: true, size: 10 };
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  row.height = 28;
}

function addListValidation(ws: ExcelJS.Worksheet, colLetter: string, fromRow: number, toRow: number, options: string[]) {
  for (let r = fromRow; r <= toRow; r++) {
    ws.getCell(`${colLetter}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${options.join(',')}"`] };
  }
}

function setColumnWidths(ws: ExcelJS.Worksheet, widths: number[]) {
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
}

function addTableSheet(
  wb: ExcelJS.Workbook,
  name: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  widths: number[],
  extraDataRows = 40,
): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(name);
  styleTitle(ws.getCell('A1'), title);
  styleSubtitle(ws.getCell('A2'), subtitle);
  const headerRow = ws.getRow(4);
  headerRow.values = headers;
  styleHeaderRow(headerRow);
  rows.forEach((r, i) => {
    const row = ws.getRow(5 + i);
    row.values = r;
    row.alignment = { wrapText: true, vertical: 'top' };
  });
  setColumnWidths(ws, widths);
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 4 }];
  const lastDataRow = 5 + Math.max(rows.length, extraDataRows) - 1;
  return Object.assign(ws, { __lastDataRow: lastDataRow });
}

function sensitivityFromFields(fields: Field[] | undefined): PipelineSensitivity {
  const classifications = (fields || []).map(f => f.classification).filter(Boolean);
  if (classifications.includes('pii')) return 'Données personnelles (RGPD)';
  if (classifications.includes('confidential')) return 'Confidentiel';
  if (classifications.includes('internal')) return 'Interne';
  return 'Aucune';
}

function parentNodeNames(nodeId: string, nodes: PipelineNode[], connectors: Connector[]): string {
  return connectors.filter(c => c.to === nodeId)
    .map(c => nodes.find(n => n.id === c.from)?.name)
    .filter(Boolean)
    .join(', ');
}

function childNodeNames(nodeId: string, nodes: PipelineNode[], connectors: Connector[]): string {
  return connectors.filter(c => c.from === nodeId)
    .map(c => nodes.find(n => n.id === c.to)?.name)
    .filter(Boolean)
    .join(', ');
}

function addModeDemploiSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet('Mode demploi');
  styleTitle(ws.getCell('A1'), 'SPÉCIFICATION DE PIPELINE — PALANTIR FOUNDRY');
  styleSubtitle(ws.getCell('A2'), 'Généré depuis Theseus · un classeur = un pipeline');
  const rows: [string, string][] = [
    ['PRINCIPE', "Ce document ne contient que ce que la plateforme ne peut pas dire : les contrats, les règles métier, les décisions et les modes de défaillance. Les onglets Sources / Destinations / Mapping / Étapes / Qualité sont pré-remplis depuis le canvas visuel ; complétez le reste (Carte d'identité, ADR, Runbook, Versions) avant livraison."],
    ["1. Carte d'identité", 'Qui possède, pour qui, avec quel engagement. À compléter en premier, obligatoire.'],
    ['2. Sources', "Une ligne par dataset d'entrée, dérivée des nodes source du canvas."],
    ['3. Destinations', "Une ligne par sortie, dérivée des nodes destination du canvas."],
    ['4. Mapping & transformations', 'Le cœur : une ligne par champ transformé, avec la règle métier dérivée de la configuration de chaque node.'],
    ['5. Étapes du pipeline', 'Une ligne par transformation du canvas.'],
    ['6. Règles de qualité', 'Une ligne par contrôle qualité détecté sur le canvas (déduplication, valeurs manquantes, contrôle qualité...).'],
    ['7. Décisions (ADR)', 'Le registre des choix structurants — saisi manuellement, hors scope du canvas.'],
    ['8. Runbook', 'Modes de défaillance et procédures de reprise — saisi manuellement.'],
    ['9. Versions', 'Historique du document et statut de validation.'],
  ];
  rows.forEach(([label, text], i) => {
    const r = ws.getRow(4 + i);
    r.getCell(1).value = label;
    r.getCell(1).font = { bold: true };
    r.getCell(2).value = text;
    r.getCell(2).alignment = { wrapText: true };
  });
  setColumnWidths(ws, [28, 100]);
}

function addIdentityCardSheet(wb: ExcelJS.Workbook, pipelineName: string, metadata: MissionSpecMetadata) {
  const ws = wb.addWorksheet("1. Carte didentité");
  styleTitle(ws.getCell('A1'), "CARTE D'IDENTITÉ DU PIPELINE");
  styleSubtitle(ws.getCell('A2'), 'Une page, tout le monde la lit. Si un champ est vide ici, le document n\'est pas livrable.');
  const card = metadata.identityCard;
  const rows: [string, string][] = [
    ['Nom du pipeline', pipelineName],
    ['Finalité (une phrase)', card.purpose || ''],
    ['Propriétaire (UNE personne)', card.owner || ''],
    ['Contact de secours', card.backupContact || ''],
    ['Criticité', card.criticality || ''],
    ['Consommateurs en aval', card.downstreamConsumers || ''],
    ['Engagement de fraîcheur (SLA)', card.freshnessSla || ''],
    ['Fenêtre de disponibilité attendue', card.availabilityWindow || ''],
    ['Environnement Foundry', card.foundryEnvironment || ''],
    ['Lien — repo de code', card.links?.repo || ''],
    ['Lien — lineage', card.links?.lineage || ''],
    ['Lien — schedule(s)', card.links?.schedule || ''],
    ['Lien — health checks', card.links?.healthChecks || ''],
    ['Sensibilité globale', card.sensitivity || ''],
    ['Date de dernière validation de ce document', card.lastValidatedAt || ''],
  ];
  rows.forEach(([label, value], i) => {
    const r = ws.getRow(4 + i);
    r.getCell(1).value = label;
    r.getCell(1).font = { bold: true };
    r.getCell(2).value = value;
    r.getCell(2).alignment = { wrapText: true };
  });
  setColumnWidths(ws, [42, 90, 9]);
  addListValidation(ws, 'B', 8, 8, ['Vitale', 'Haute', 'Moyenne', 'Basse']);
  addListValidation(ws, 'B', 17, 17, ['Aucune', 'Interne', 'Confidentiel', 'Données personnelles (RGPD)']);
}

function addSourcesSheet(wb: ExcelJS.Workbook, nodes: PipelineNode[]) {
  const sources = nodes.filter(n => n.type === 'source');
  const headers = ['#', 'Dataset source (nom)', 'Chemin / RID Foundry', "Système d'origine", 'Propriétaire de la source (contact)', 'Fréquence de mise à jour', 'Volumétrie indicative', 'Garanties données (contrat)', 'Garanties NON tenues (constaté)', 'Préavis en cas de changement de schéma', 'Sensibilité', 'Notes'];
  const rows = sources.map((s, i) => [
    `S${i + 1}`, s.name, s.location || '', s.system || '', '', s.qualityMetrics?.freshness || '', '',
    s.qualityMetrics?.completeness !== undefined ? `Complétude constatée : ${s.qualityMetrics.completeness}%` : '',
    '', '', sensitivityFromFields(s.outputFields), s.description || '',
  ]);
  const ws = addTableSheet(wb, '2. Sources', "SOURCES — LES CONTRATS D'ENTRÉE",
    "Une ligne par dataset d'entrée, pré-remplie depuis le canvas. La colonne « garanties NON tenues » est la plus précieuse : c'est là que vivent les incidents futurs — à compléter manuellement.",
    headers, rows, [4, 26, 30, 16, 24, 16, 14, 38, 38, 18, 16, 24]);
  addListValidation(ws, 'K', 5, 45, ['Aucune', 'Interne', 'Confidentiel', 'Données personnelles (RGPD)']);
}

function addDestinationsSheet(wb: ExcelJS.Workbook, nodes: PipelineNode[], connectors: Connector[]) {
  const destinations = nodes.filter(n => n.type === 'destination');
  const headers = ['#', 'Sortie (nom)', 'Type', "Chemin / RID ou objet d'ontologie", 'Consommateurs (apps, équipes, exports)', 'Usage principal', 'Engagement de fraîcheur', 'Politique de breaking change', 'Clé primaire / grain', 'Rétention / historisation', 'Notes'];
  const rows = destinations.map((d, i) => [
    `D${i + 1}`, d.name, 'Dataset', d.location || '', '', d.description || '', '', '', '', '', `Alimenté par : ${parentNodeNames(d.id, nodes, connectors) || '(non connecté)'}`,
  ]);
  const ws = addTableSheet(wb, '3. Destinations', 'DESTINATIONS — LES ENGAGEMENTS DE SORTIE',
    "Une ligne par sortie, pré-remplie depuis le canvas. Le schéma détaillé est dans l'onglet Mapping ; ici, l'engagement — à compléter manuellement.",
    headers, rows, [4, 26, 16, 30, 26, 18, 32, 20, 18, 22, 24]);
  addListValidation(ws, 'C', 5, 45, ['Dataset', "Objet d'ontologie", 'Export fichier', 'API / Webhook', 'Autre']);
}

function addMappingSheet(wb: ExcelJS.Workbook, nodes: PipelineNode[], connectors: Connector[]) {
  const transforms = nodes.filter(n => n.type === 'transformation');
  const rows: (string | number)[][] = [];
  let counter = 1;
  transforms.forEach((node) => {
    const parents = parentNodeNames(node.id, nodes, connectors);
    const fields = node.outputFields && node.outputFields.length > 0 ? node.outputFields : [{ name: '(tous les champs)', type: '' }];
    fields.forEach((field) => {
      rows.push([
        `M${counter++}`,
        childNodeNames(node.id, nodes, connectors) || node.name,
        field.name,
        field.type || '',
        parents || '(aucune source connectée)',
        field.name,
        describeOperationRule(node.operation),
        describeNullHandling(node.operation),
        describeDedupRule(node.operation),
        '',
        '',
        '',
        'Brouillon',
        node.description || '',
      ]);
    });
  });
  const headers = ['#', 'Sortie (D#)', 'Champ cible', 'Type cible', 'Dataset(s) source', 'Champ(s) source', 'Règle de transformation (logique métier complète)', 'Gestion des nulls / absents', 'Règle de dédoublonnage / agrégation', 'Exemple : entrée → sortie', 'Criticité', 'Règle de qualité liée (Q#)', 'Statut', 'Notes / question ouverte'];
  const ws = addTableSheet(wb, '4. Mapping & transfos', 'MAPPING SOURCE → CIBLE ET RÈGLES DE TRANSFORMATION',
    'Une ligne par champ cible, pré-remplie depuis la configuration de chaque node. Complétez Exemple, Criticité et les questions ouvertes avec le métier.',
    headers, rows, [4, 10, 22, 12, 24, 20, 46, 26, 26, 34, 12, 14, 14, 24], 50);
  addListValidation(ws, 'K', 5, 55, ['Vitale', 'Haute', 'Moyenne', 'Basse']);
  addListValidation(ws, 'M', 5, 55, ['Brouillon', 'À valider métier', 'Validé métier', 'Implémenté', 'Recetté']);
}

function addStepsSheet(wb: ExcelJS.Workbook, nodes: PipelineNode[], connectors: Connector[]) {
  const transforms = nodes.filter(n => n.type === 'transformation');
  const rows = transforms.map((node, i) => [
    `T${i + 1}`,
    node.name,
    '',
    parentNodeNames(node.id, nodes, connectors) || '(aucune entrée connectée)',
    childNodeNames(node.id, nodes, connectors) || '(aucune sortie connectée)',
    node.description || describeOperationRule(node.operation),
    node.operation?.type === 'sql_pattern' && (node.operation as any).settings?.patternId === 'incremental_load' ? 'Incrémental' : '',
    '', '', '', '',
  ]);
  const headers = ['#', 'Nom du transform', 'Repo / chemin du code', 'Entrée(s)', 'Sortie', 'Rôle (que fait cette étape et pourquoi elle existe)', 'Mode de calcul', 'Partitionnement / clés', 'Planification (schedule)', 'Durée typique', 'Notes'];
  const ws = addTableSheet(wb, '5. Étapes du pipeline', 'ÉTAPES — UNE LIGNE PAR TRANSFORM',
    'Une ligne par transform, pré-remplie depuis le canvas. Complétez le mode de calcul, le partitionnement et la planification.',
    headers, rows, [4, 24, 30, 24, 22, 42, 16, 20, 22, 12, 20]);
  addListValidation(ws, 'G', 5, 45, ['Incrémental', 'Snapshot complet', 'Incrémental avec rattrapage', 'Streaming']);
}

function addQualitySheet(wb: ExcelJS.Workbook, nodes: PipelineNode[]) {
  const qualityNodes = nodes.filter(n => n.type === 'transformation' && isQualityOperation(n.operation));
  const rows = qualityNodes.map((node, i) => [
    `Q${i + 1}`,
    node.name,
    operationControlType(node.operation!),
    describeOperationRule(node.operation),
    '', 'Alerte (non bloquant)', '', '', '', node.description || '',
  ]);
  const headers = ['Q#', 'Portée (dataset / champ)', 'Type de contrôle', 'Règle précise', 'Seuil de tolérance', 'Action si dépassement', 'Implémentation (health check, expectation…)', 'Qui est alerté', 'Fréquence', 'Notes'];
  const ws = addTableSheet(wb, '6. Règles de qualité', 'RÈGLES DE QUALITÉ — CONTRÔLES AUTOMATISABLES',
    'Une ligne par contrôle qualité détecté sur le canvas. Complétez le seuil, l\'implémentation et les destinataires des alertes.',
    headers, rows, [5, 26, 18, 40, 16, 22, 30, 20, 14, 20]);
  addListValidation(ws, 'C', 5, 45, ['Complétude', 'Unicité', 'Cohérence référentielle', 'Fraîcheur', 'Plage de validité', 'Volumétrie', 'Autre']);
  addListValidation(ws, 'F', 5, 45, ['Bloquant (stoppe le build)', 'Alerte (non bloquant)', 'Journalisé uniquement']);
}

function addAdrSheet(wb: ExcelJS.Workbook, metadata: MissionSpecMetadata) {
  const rows = metadata.adrs.map(a => [a.id, a.date, a.decision, a.context, a.alternatives, a.deciders, a.impact]);
  const headers = ['ADR-#', 'Date', 'Décision', 'Contexte (pourquoi la question se posait)', 'Alternative(s) écartée(s) et pourquoi', 'Décideur(s)', 'Impact si remise en cause'];
  addTableSheet(wb, '7. Décisions (ADR)', 'REGISTRE DES DÉCISIONS',
    "Trois lignes par décision suffisent. C'est l'onglet qui vaut le plus cher dans 18 mois.",
    headers, rows, [8, 12, 36, 40, 40, 26, 40], 20);
}

function addRunbookSheet(wb: ExcelJS.Workbook, metadata: MissionSpecMetadata) {
  const rows = metadata.runbook.map(r => [r.id, r.scenario, r.symptom, r.diagnosis, r.procedure, r.backfill, r.recoveryDuration, r.escalation]);
  const headers = ['#', 'Scénario de défaillance', "Symptôme observable (comment on s'en aperçoit)", 'Diagnostic (comment confirmer)', 'Procédure de reprise (étapes numérotées)', 'Comment backfiller si besoin', 'Durée de reprise estimée', 'Escalade (qui appeler si ça ne suffit pas)'];
  addTableSheet(wb, '8. Runbook', 'MODES DE DÉFAILLANCE ET PROCÉDURES DE REPRISE',
    "Test du 3 heures du matin : quelqu'un qui n'a jamais touché ce pipeline doit pouvoir diagnostiquer et relancer avec cette feuille seule.",
    headers, rows, [4, 26, 28, 30, 44, 30, 14, 22], 20);
}

function addVersionsSheet(wb: ExcelJS.Workbook, metadata: MissionSpecMetadata) {
  const rows = metadata.versions.map(v => [v.version, v.date, v.author, v.changes, v.validatedBy]);
  const headers = ['Version', 'Date', 'Auteur', 'Changements', 'Validé par (métier / tech)'];
  addTableSheet(wb, '9. Versions', 'HISTORIQUE DU DOCUMENT',
    'Rappel : la mise à jour de ce classeur fait partie de la definition of done de tout changement du pipeline.',
    headers, rows, [10, 14, 20, 60, 26], 15);
}

export async function generateMissionSpecWorkbook(
  pipelineName: string,
  nodes: PipelineNode[],
  connectors: Connector[],
  metadata: MissionSpecMetadata,
): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Theseus';
  wb.created = new Date();

  addModeDemploiSheet(wb);
  addIdentityCardSheet(wb, pipelineName, metadata);
  addSourcesSheet(wb, nodes);
  addDestinationsSheet(wb, nodes, connectors);
  addMappingSheet(wb, nodes, connectors);
  addStepsSheet(wb, nodes, connectors);
  addQualitySheet(wb, nodes);
  addAdrSheet(wb, metadata);
  addRunbookSheet(wb, metadata);
  addVersionsSheet(wb, metadata);

  return wb.xlsx.writeBuffer();
}
