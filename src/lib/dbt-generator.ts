import {
  PipelineNode, Connector, JoinOperation, FilterOperation, GroupByOperation,
  SortOperation, SelectColumnsOperation, DeduplicationOperation,
  MissingValuesOperation, SqlPatternOperation,
} from './pipeline-data';
import { getPattern, renderPatternSql } from './transformation-patterns';

/**
 * Generates a dbt project (sources.yml + one model per transformation/dataset
 * node + schema.yml) from the pipeline canvas, bundled as a single
 * downloadable text file with clear per-file section headers — mirrors how
 * python-generator.ts bundles a single PySpark script.
 */
export function generateDbtProject(nodes: PipelineNode[] = [], connectors: Connector[] = []): string {
  if (!nodes || nodes.length === 0) {
    return "-- No nodes defined in the pipeline canvas.";
  }

  const sources = nodes.filter(n => n.type === 'source');
  const modelNodes = nodes.filter(n => n.type === 'transformation' || n.type === 'dataset');
  const destinations = nodes.filter(n => n.type === 'destination');

  const modelNameMap = new Map<string, string>();
  const nameCounts = new Map<string, number>();
  const toModelName = (node: PipelineNode): string => {
    if (modelNameMap.has(node.id)) return modelNameMap.get(node.id)!;
    const base = node.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'model';
    const count = nameCounts.get(base) || 0;
    nameCounts.set(base, count + 1);
    const name = count === 0 ? base : `${base}_${count}`;
    modelNameMap.set(node.id, name);
    return name;
  };
  sources.forEach(toModelName);
  modelNodes.forEach(toModelName);
  destinations.forEach(toModelName);

  // Reference a parent node from SQL: dbt source() for raw sources, ref() for models.
  const refExpr = (nodeId: string): string => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return `{{ ref('${nodeId}') }}`;
    if (node.type === 'source') return `{{ source('pipeline', '${toModelName(node)}') }}`;
    return `{{ ref('${toModelName(node)}') }}`;
  };

  let out = `-- ============================================================\n`;
  out += `-- dbt project generated from the Theseus pipeline\n`;
  out += `-- ============================================================\n\n`;

  // --- models/sources.yml ---
  out += `-- ---------- models/sources.yml ----------\n`;
  out += `version: 2\n\nsources:\n  - name: pipeline\n    tables:\n`;
  sources.forEach(s => {
    out += `      - name: ${toModelName(s)}\n`;
    if (s.location) out += `        identifier: "${s.location}"\n`;
    (s.outputFields || []).forEach(f => {
      out += `        # column ${f.name}: ${f.type}${f.nullable ? ' (nullable)' : ''}\n`;
    });
  });
  if (sources.length === 0) out += `      []\n`;
  out += `\n`;

  // --- Topological order over model nodes only ---
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const order: string[] = [];
  const visit = (nodeId: string) => {
    if (visited.has(nodeId) || visiting.has(nodeId)) return;
    visiting.add(nodeId);
    connectors.filter(c => c.to === nodeId).forEach(c => visit(c.from));
    visiting.delete(nodeId);
    visited.add(nodeId);
    order.push(nodeId);
  };
  nodes.forEach(n => visit(n.id));

  order.forEach(nodeId => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || (node.type !== 'transformation' && node.type !== 'dataset')) return;

    const modelName = toModelName(node);
    const parentIds = connectors.filter(c => c.to === nodeId).map(c => c.from);
    const fromExpr = parentIds.length > 0 ? refExpr(parentIds[0]) : `-- Warning: "${node.name}" has no input`;

    out += `-- ---------- models/${modelName}.sql ----------\n`;
    out += `{{ config(materialized='view') }}\n\n`;
    out += buildModelSql(node, parentIds, refExpr, fromExpr);
    out += `\n\n`;
  });

  // --- Destinations: which model they materialize ---
  if (destinations.length > 0) {
    out += `-- ---------- destinations ----------\n`;
    destinations.forEach(dest => {
      const parentIds = connectors.filter(c => c.to === dest.id).map(c => c.from);
      const source = parentIds.length > 0 ? toModelName(nodes.find(n => n.id === parentIds[0])!) : 'undefined';
      out += `-- "${dest.name}" (${dest.location || 'unspecified location'}) <- model "${source}"\n`;
    });
    out += `\n`;
  }

  // --- schema.yml with not_null / pii tests derived from the field metadata ---
  out += `-- ---------- models/schema.yml ----------\n`;
  out += `version: 2\n\nmodels:\n`;
  modelNodes.forEach(node => {
    const modelName = toModelName(node);
    out += `  - name: ${modelName}\n`;
    const fields = node.outputFields || [];
    if (fields.length > 0) {
      out += `    columns:\n`;
      fields.forEach(f => {
        const tests: string[] = [];
        if (f.nullable === false) tests.push('not_null');
        out += `      - name: ${f.name}\n`;
        if (tests.length > 0) out += `        tests: [${tests.join(', ')}]\n`;
        if (f.classification === 'pii') out += `        meta:\n          classification: pii\n`;
      });
    }
  });

  return out;
}

function buildModelSql(
  node: PipelineNode,
  parentIds: string[],
  refExpr: (nodeId: string) => string,
  fromExpr: string,
): string {
  const op = node.operation;

  if (!op || op.type === 'no_op') {
    return `SELECT *\nFROM ${fromExpr}`;
  }

  switch (op.type) {
    case 'filter': {
      const fOp = op as FilterOperation;
      if (!fOp.settings.field) return `SELECT *\nFROM ${fromExpr}  -- Warning: filter has no field configured`;
      let value = fOp.settings.value;
      if (typeof value === 'string') value = `'${value}'`;
      const operator = fOp.settings.operator === '=' ? '=' : fOp.settings.operator;
      return `SELECT *\nFROM ${fromExpr}\nWHERE ${fOp.settings.field} ${operator} ${value}`;
    }

    case 'join': {
      const jOp = op as JoinOperation;
      if (parentIds.length < 2) return `SELECT *\nFROM ${fromExpr}  -- Warning: join requires 2 inputs, got ${parentIds.length}`;
      const parentSet = new Set(parentIds);
      let leftId = parentSet.has(jOp.settings.leftNodeId) ? jOp.settings.leftNodeId : parentIds[0];
      let rightId = parentSet.has(jOp.settings.rightNodeId) ? jOp.settings.rightNodeId : parentIds[1];
      const leftField = jOp.settings.condition?.leftField;
      const rightField = jOp.settings.condition?.rightField;
      const joinType = (jOp.settings.joinType || 'inner').toUpperCase();
      const dbtJoinType = joinType === 'FULL' ? 'FULL OUTER' : joinType;
      if (!leftField || !rightField) {
        return `SELECT a.*, b.*\nFROM ${refExpr(leftId)} a\n${dbtJoinType} JOIN ${refExpr(rightId)} b ON TRUE  -- Warning: join condition not fully specified`;
      }
      return `SELECT a.*, b.*\nFROM ${refExpr(leftId)} a\n${dbtJoinType} JOIN ${refExpr(rightId)} b\n  ON a.${leftField} = b.${rightField}`;
    }

    case 'group_by': {
      const gOp = op as GroupByOperation;
      const groupByFields = gOp.settings.groupByFields || [];
      const aggregations = gOp.settings.aggregations || [];
      const groupCols = groupByFields.join(', ');
      if (aggregations.length === 0) {
        return `SELECT ${groupCols}, COUNT(*) AS row_count\nFROM ${fromExpr}\nGROUP BY ${groupCols}`;
      }
      const aggExprs = aggregations.map(a => {
        const fn = a.type === 'avg' ? 'AVG' : a.type.toUpperCase();
        const alias = a.newName || `${a.type}_${a.field}`;
        return `${fn}(${a.field}) AS ${alias}`;
      }).join(',\n    ');
      const select = groupCols ? `${groupCols},\n    ${aggExprs}` : aggExprs;
      return `SELECT\n    ${select}\nFROM ${fromExpr}\nGROUP BY ${groupCols || '1'}`;
    }

    case 'sort': {
      const sOp = op as SortOperation;
      const conditions = sOp.settings.conditions || [];
      if (conditions.length === 0) return `SELECT *\nFROM ${fromExpr}  -- Warning: no sort conditions configured`;
      const orderBy = conditions.map(c => `${c.field} ${c.direction === 'desc' ? 'DESC' : 'ASC'}`).join(', ');
      return `SELECT *\nFROM ${fromExpr}\nORDER BY ${orderBy}`;
    }

    case 'select_columns': {
      const selOp = op as SelectColumnsOperation;
      const cols = selOp.settings.selectedFields || [];
      if (cols.length === 0) return `SELECT *\nFROM ${fromExpr}  -- Warning: no columns selected`;
      return `SELECT\n    ${cols.join(',\n    ')}\nFROM ${fromExpr}`;
    }

    case 'union': {
      if (parentIds.length < 2) return `SELECT *\nFROM ${fromExpr}  -- Warning: union requires 2+ inputs, got ${parentIds.length}`;
      return parentIds.map(id => `SELECT * FROM ${refExpr(id)}`).join('\nUNION ALL\n');
    }

    case 'deduplication': {
      const dOp = op as DeduplicationOperation;
      const cols = dOp.settings.columns || [];
      if (cols.length === 0) return `SELECT DISTINCT *\nFROM ${fromExpr}`;
      return `SELECT DISTINCT ON (${cols.join(', ')})\n    *\nFROM ${fromExpr}`;
    }

    case 'handle_missing_values': {
      const mvOp = op as MissingValuesOperation;
      const cols = mvOp.settings.columns || [];
      if (mvOp.settings.strategy === 'drop') {
        if (cols.length === 0) return `SELECT *\nFROM ${fromExpr}`;
        const conditions = cols.map(c => `${c} IS NOT NULL`).join('\n  AND ');
        return `SELECT *\nFROM ${fromExpr}\nWHERE ${conditions}`;
      }
      let fillVal = mvOp.settings.fillValue;
      if (typeof fillVal === 'string') fillVal = `'${fillVal}'`;
      if (cols.length === 0) return `SELECT *\nFROM ${fromExpr}`;
      const coalesced = cols.map(c => `COALESCE(${c}, ${fillVal}) AS ${c}`).join(',\n    ');
      return `SELECT\n    * EXCLUDE (${cols.join(', ')}),\n    ${coalesced}\nFROM ${fromExpr}`;
    }

    case 'sql_pattern': {
      const pOp = op as SqlPatternOperation;
      const pattern = getPattern(pOp.settings.patternId);
      if (!pattern) return `SELECT *\nFROM ${fromExpr}  -- Warning: no SQL pattern selected`;
      return renderPatternSql(pattern, pOp.settings.params || {});
    }

    default:
      return `SELECT *\nFROM ${fromExpr}  -- Transformation "${op.type}" has no dbt equivalent yet, review manually`;
  }
}
