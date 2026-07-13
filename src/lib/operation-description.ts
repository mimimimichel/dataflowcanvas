import {
  Operation, FilterOperation, JoinOperation, GroupByOperation, SortOperation,
  SelectColumnsOperation, DeduplicationOperation, MissingValuesOperation,
  SqlPatternOperation, QualityControlType,
} from './pipeline-data';
import { getPattern } from './transformation-patterns';

const QUALITY_OPERATION_TYPES = new Set([
  'deduplication', 'handle_missing_values', 'quality_control', 'standardize_strings', 'normalize_formats', 'fix_typos',
]);

/** Plain-French business rule for the "Mapping & transfos" sheet — must be implementable without asking questions. */
export function describeOperationRule(op: Operation | undefined): string {
  if (!op || op.type === 'no_op') return 'Recopie directe du champ source, sans transformation.';

  switch (op.type) {
    case 'filter': {
      const f = op as FilterOperation;
      if (!f.settings.field) return 'Filtre non configuré.';
      return `Conserver uniquement les lignes où ${f.settings.field} ${f.settings.operator} ${JSON.stringify(f.settings.value)}.`;
    }
    case 'join': {
      const j = op as JoinOperation;
      const jt = { inner: 'stricte (INNER)', left: 'à gauche (LEFT)', right: 'à droite (RIGHT)', full: 'complète (FULL)' }[j.settings.joinType] || j.settings.joinType;
      return `Jointure ${jt} sur ${j.settings.condition?.leftField || '?'} = ${j.settings.condition?.rightField || '?'}.`;
    }
    case 'group_by': {
      const g = op as GroupByOperation;
      const aggs = (g.settings.aggregations || []).map(a => `${a.type}(${a.field}) → ${a.newName}`).join(', ');
      return `Regrouper par ${(g.settings.groupByFields || []).join(', ') || '(aucune clé)'}${aggs ? ` ; calculer ${aggs}` : ''}.`;
    }
    case 'sort':
      return `Trier par ${((op as SortOperation).settings.conditions || []).map(c => `${c.field} ${c.direction}`).join(', ') || '(non configuré)'}.`;
    case 'select_columns':
      return `Ne conserver que les colonnes : ${((op as SelectColumnsOperation).settings.selectedFields || []).join(', ') || '(non configuré)'}.`;
    case 'union':
      return 'Empiler (union) les lignes de toutes les sources connectées, sans déduplication.';
    case 'deduplication': {
      const d = op as DeduplicationOperation;
      return d.settings.columns?.length
        ? `Dédoublonner sur (${d.settings.columns.join(', ')}) — une ligne conservée par combinaison de valeurs.`
        : 'Dédoublonner sur la ligne complète (toutes colonnes).';
    }
    case 'handle_missing_values': {
      const m = op as MissingValuesOperation;
      const cols = m.settings.columns?.length ? m.settings.columns.join(', ') : 'toutes les colonnes';
      return m.settings.strategy === 'drop'
        ? `Rejeter les lignes dont ${cols} est/sont vide(s)/null.`
        : `Remplacer les valeurs vides/null de ${cols} par ${JSON.stringify(m.settings.fillValue)}.`;
    }
    case 'normalize_formats':
      return `Normaliser le format (${op.settings.format || 'date'}) des colonnes : ${(op.settings.columns || []).join(', ') || '(non configuré)'}.`;
    case 'fix_typos':
      return 'Corriger les valeurs selon la table de correspondance configurée (fautes de frappe / libellés incohérents).';
    case 'quality_control':
      return `Valider chaque ligne selon les règles configurées ; rejeter/tracer les lignes non conformes (${(op.settings.rules || []).length} règle(s)).`;
    case 'standardize_strings':
      return `Standardiser la casse (${op.settings.strategy || 'lower'}) des colonnes : ${(op.settings.columns || []).join(', ') || '(non configuré)'}.`;
    case 'pivot_unpivot':
      return op.settings.direction === 'pivot'
        ? `Pivoter : une colonne par valeur de ${op.settings.pivotColumn || '?'}, agrégée avec ${op.settings.aggFunction || 'sum'}(${op.settings.valueColumn || '?'}).`
        : `Dépivoter les colonnes ${(op.settings.valueColumns || []).join(', ') || '?'} vers des lignes clé/valeur.`;
    case 'split_merge_columns':
      return op.settings.operation === 'merge'
        ? `Fusionner les colonnes ${(op.settings.sourceColumns || []).join(', ') || '?'} en ${op.settings.targetColumn || '?'} (séparateur "${op.settings.separator || '_'}").`
        : `Découper ${op.settings.sourceColumn || '?'} en ${(op.settings.newColumns || []).join(', ') || '?'} (délimiteur "${op.settings.delimiter || ','}").`;
    case 'transpose':
      return 'Transposer lignes et colonnes selon la configuration.';
    case 'denormalize':
      return `Dénormaliser via jointure(s) avec ${(op.settings.joins || []).length} table(s) de référence.`;
    case 'nested_to_flat':
      return `Aplatir les colonnes imbriquées : ${(op.settings.columns || []).join(', ') || '(non configuré)'}.`;
    case 'array_operations':
      return `Opération sur tableau "${op.settings.operation || 'explode'}" sur la colonne ${op.settings.column || '?'}.`;
    case 'sql_pattern': {
      const p = getPattern((op as SqlPatternOperation).settings.patternId);
      return p ? `${p.description} (pattern SQL "${p.name}").` : 'Pattern SQL non sélectionné.';
    }
    default:
      return `Transformation "${op.type}" — décrire la règle métier manuellement.`;
  }
}

/** "Gestion des nulls / absents" cell, when the operation says something about it explicitly. */
export function describeNullHandling(op: Operation | undefined): string {
  if (op?.type === 'handle_missing_values') {
    const m = op as MissingValuesOperation;
    return m.settings.strategy === 'drop' ? 'Lignes rejetées si valeur absente.' : `Valeur de repli : ${JSON.stringify(m.settings.fillValue)}.`;
  }
  return '';
}

/** "Règle de dédoublonnage / agrégation" cell. */
export function describeDedupRule(op: Operation | undefined): string {
  if (op?.type === 'deduplication') {
    const d = op as DeduplicationOperation;
    return d.settings.columns?.length ? `Clé : ${d.settings.columns.join(', ')}.` : 'Ligne complète.';
  }
  if (op?.type === 'group_by') return 'Agrégation — voir règle de transformation.';
  return '';
}

export function isQualityOperation(op: Operation | undefined): boolean {
  if (!op) return false;
  if (QUALITY_OPERATION_TYPES.has(op.type)) return true;
  if (op.type === 'sql_pattern') {
    const p = getPattern((op as SqlPatternOperation).settings.patternId);
    return p?.category === 'quality';
  }
  return false;
}

const CONTROL_TYPE_MAP: Record<string, QualityControlType> = {
  deduplication: 'Unicité',
  handle_missing_values: 'Complétude',
  quality_control: 'Plage de validité',
  standardize_strings: 'Cohérence référentielle',
  normalize_formats: 'Cohérence référentielle',
  fix_typos: 'Cohérence référentielle',
};

export function operationControlType(op: Operation): QualityControlType {
  if (op.type === 'sql_pattern') {
    const patternId = (op as SqlPatternOperation).settings.patternId;
    if (patternId === 'dedup_by_key') return 'Unicité';
    if (patternId === 'row_quality_tests') return 'Plage de validité';
    if (patternId === 'soft_delete_filter') return 'Cohérence référentielle';
    return 'Autre';
  }
  return CONTROL_TYPE_MAP[op.type] || 'Autre';
}
