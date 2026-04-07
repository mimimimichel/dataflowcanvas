/**
 * Data Uploader — parse CSV/JSON files into sample data rows
 * Transforms engine — applies operations to sample data for preview
 */
import type { Field } from '@/lib/pipeline-data';

export interface ParsedData {
  fields: Field[];
  rows: Record<string, unknown>[];
  rowCount: number;
  errors: string[];
}

function detectType(value: string): string {
  if (value === '' || value.toLowerCase() === 'null' || value.toLowerCase() === 'undefined') return 'string';
  if (/^\d+$/.test(value)) return 'integer';
  if (/^-?\d*\.\d+$/.test(value)) return 'number';
  if (/^(true|false)$/i.test(value)) return 'boolean';
  if (/^\d{4}-\d{2}-\d{2}[T ]?\d{2}:?\d{2}/.test(value)) return 'timestamp';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
  return 'string';
}

function parseCSV(text: string): ParsedData {
  text = text.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) {
    return { fields: [], rows: [], rowCount: 0, errors: ['File needs at least a header row and one data row'] };
  }

  const parseCSVLine = (line: string): string[] => {
    const vals: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        vals.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    vals.push(current.trim());
    return vals;
  };

  const headers = parseCSVLine(lines[0]);
  const errors: string[] = [];
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (vals.length !== headers.length) {
      errors.push(`Line ${i + 1}: expected ${headers.length} columns, got ${vals.length}`);
      continue;
    }
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => { row[h] = vals[idx]; });
    rows.push(row);
  }

  // Infer fields from first 10 rows
  const sampleRows = rows.slice(0, 10);
  const fields: Field[] = headers.map(h => {
    const values = sampleRows.map(r => String(r[h] ?? ''));
    const types = values.filter(v => v !== '').map(detectType);
    const typeCounts: Record<string, number> = {};
    types.forEach(t => { typeCounts[t] = (typeCounts[t] || 0) + 1; });
    let bestType = 'string';
    let bestCount = 0;
    for (const [t, c] of Object.entries(typeCounts)) {
      if (c > bestCount) { bestCount = c; bestType = t; }
    }
    const nulls = sampleRows.filter(r => r[h] === '' || r[h] === null || r[h] === undefined).length;
    return { name: h, type: bestType, nullable: nulls > 0 };
  });

  return { fields, rows, rowCount: rows.length, errors };
}

function parseJSON(text: string): ParsedData {
  const errors: string[] = [];
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { fields: [], rows: [], rowCount: 0, errors: ['Invalid JSON: ' + (e as Error).message] };
  }

  let rows: Record<string, unknown>[] = [];
  if (Array.isArray(data)) {
    rows = data.filter(r => typeof r === 'object' && r !== null);
  } else if (typeof data === 'object') {
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
        rows = v.filter(r => typeof r === 'object' && r !== null);
        break;
      }
    }
    if (rows.length === 0 && Object.keys(data).length > 0) {
      rows = [data as Record<string, unknown>];
    }
  }

  if (rows.length === 0) {
    return { fields: [], rows: [], rowCount: 0, errors: ['No array of objects found'] };
  }

  const displayRows = rows.slice(0, 10000);
  const keys = new Set<string>();
  rows.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
  const allKeys = Array.from(keys);
  const sampleRows = rows.slice(0, 10);
  const fields: Field[] = allKeys.map(k => {
    const values = sampleRows.map(r => {
      const v = r[k];
      return v === null || v === undefined ? '' : String(v);
    });
    const types = values.filter(v => v !== '').map(detectType);
    const typeCounts: Record<string, number> = {};
    types.forEach(t => { typeCounts[t] = (typeCounts[t] || 0) + 1; });
    let bestType = 'string';
    let bestCount = 0;
    for (const [t, c] of Object.entries(typeCounts)) {
      if (c > bestCount) { bestCount = c; bestType = t; }
    }
    const nulls = sampleRows.filter(r => r[k] === null || r[k] === undefined).length;
    return { name: k, type: bestType, nullable: nulls > 0 };
  });

  return { fields, rows: displayRows, rowCount: rows.length, errors };
}

export function parseFile(text: string, format: 'csv' | 'json'): ParsedData {
  if (format === 'json') return parseJSON(text);
  return parseCSV(text);
}

// ========================================================================
// TRANSFORM ENGINE — applies operations to sample data for preview
// ========================================================================

export function applyTransforms(
  data: Record<string, unknown>[],
  nodes: { id: string; operation?: { type: string; settings: Record<string, unknown> } }[],
  connectors: { from: string; to: string }[],
  startNodeId: string
): Record<string, Record<string, unknown>[]> {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const dataCache = new Map<string, Record<string, unknown>[]>();
  dataCache.set(startNodeId, data);

  // Topological-ish BFS
  const queue: string[] = [startNodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const inputData = dataCache.get(nodeId) || [];

    // Apply operation
    let outputData = inputData;
    if (node.operation) {
      outputData = applySingleTransform(inputData, node.operation.type, node.operation.settings);
    }
    dataCache.set(nodeId, outputData);

    // Find downstream nodes
    for (const conn of connectors) {
      if (conn.from === nodeId && !visited.has(conn.to)) {
        dataCache.set(conn.to, outputData); // upstream output feeds downstream input
        queue.push(conn.to);
      }
    }
  }

  // Build result map
  const result: Record<string, Record<string, unknown>[]> = {};
  for (const [nodeId, rows] of dataCache) {
    result[nodeId] = rows;
  }
  return result;
}

export function applySingleTransform(
  data: Record<string, unknown>[],
  opType: string,
  settings: Record<string, unknown>
): Record<string, unknown>[] {
  if (!data || data.length === 0) return data;

  switch (opType) {
    case 'filter': {
      const { field, operator, value } = settings;
      if (!field || !operator) return data;
      const parsedValue = typeof value === 'string' ? value.replace(/^['"]|['"]$/g, '') : value;
      return data.filter(row => {
        const cell = String(row[field as string] ?? '');
        const cmp = String(parsedValue);
        switch (operator) {
          case '==': return cell === cmp;
          case '!=': return cell !== cmp;
          case '>': return parseFloat(cell) > parseFloat(cmp);
          case '<': return parseFloat(cell) < parseFloat(cmp);
          case '>=': return parseFloat(cell) >= parseFloat(cmp);
          case '<=': return parseFloat(cell) <= parseFloat(cmp);
          case 'contains': return cell.toLowerCase().includes(cmp.toLowerCase());
          default: return true;
        }
      });
    }
    case 'select_columns': {
      const columns = (settings.columns as string[]) || [];
      if (columns.length === 0) return data;
      return data.map(row => {
        const newRow: Record<string, unknown> = {};
        columns.forEach(c => { if (c in row) newRow[c] = row[c]; });
        return newRow;
      });
    }
    case 'sort': {
      const { field, order } = settings;
      if (!field) return data;
      return [...data].sort((a, b) => {
        const aVal = String(a[field as string] ?? '');
        const bVal = String(b[field as string] ?? '');
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return order === 'desc' ? bNum - aNum : aNum - bNum;
        }
        return order === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      });
    }
    case 'deduplication': {
      const keys = (settings.keys as string[]) || [];
      if (keys.length === 0) return data;
      const seen = new Set<string>();
      return data.filter(row => {
        const key = keys.map(k => String(row[k] ?? '')).join('|||');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    case 'handle_missing_values': {
      const strategy = settings.strategy || 'keep';
      if (strategy === 'drop_na') {
        return data.filter(row => Object.values(row).every(v => v !== null && v !== undefined && String(v) !== ''));
      }
      if (strategy === 'fill') {
        const fillValue = settings.fillValue ?? '';
        return data.map(row => {
          const newRow: Record<string, unknown> = {};
          Object.entries(row).forEach(([k, v]) => {
            newRow[k] = (v === null || v === undefined || String(v) === '') ? fillValue : v;
          });
          return newRow;
        });
      }
      return data;
    }
    case 'group_by': {
      const groupByFields = (settings.groupByFields as string[]) || [];
      if (groupByFields.length === 0) return data;
      const groups = new Map<string, Record<string, unknown>[]>();
      data.forEach(row => {
        const key = groupByFields.map(f => String(row[f] ?? '')).join('|||');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
      });
      return Array.from(groups.entries()).map(([key, groupData]) => {
        const result: Record<string, unknown> = {};
        groupByFields.forEach(f => { result[f] = groupData[0][f]; });
        result['_count'] = groupData.length;
        return result;
      });
    }
    default:
      return data;
  }
}
