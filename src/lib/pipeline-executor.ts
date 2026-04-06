// Simulate pipeline data flow — applies mock transformations to preview data
import type { MockRow, MockDataset } from '@/lib/mock-data';
import { getMockDataForNode } from '@/lib/mock-data';
import type { PipelineNode, Connector, Operation } from '@/lib/pipeline-data';

// Trace upstream to find source data for any node
export function getUpstreamSource(nodeId: string, nodes: PipelineNode[], connectors: Connector[]): PipelineNode | null {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;
  if (node.type === 'source') return node;

  // Find upstream connectors
  const incoming = connectors.filter(c => c.to === nodeId);
  for (const conn of incoming) {
    const upstream = getUpstreamSource(conn.from, nodes, connectors);
    if (upstream) return upstream;
  }
  return null;
}

// Apply a single operation to mock data
function applyOperation(rows: MockRow[], operation: Operation | undefined): MockRow[] {
  if (!operation) return rows;

  switch (operation.type) {
    case 'filter': {
      const { field, operator, value } = operation.settings;
      if (!field) return rows;
      return rows.filter(row => {
        const rowVal = row[field];
        switch (operator) {
          case '==': return rowVal === value;
          case '!=': return rowVal !== value;
          case '>': return typeof rowVal === 'number' && typeof value === 'number' && rowVal > value;
          case '<': return typeof rowVal === 'number' && typeof value === 'number' && rowVal < value;
          case '>=': return typeof rowVal === 'number' && typeof value === 'number' && rowVal >= value;
          case '<=': return typeof rowVal === 'number' && typeof value === 'number' && rowVal <= value;
          case 'contains': return typeof rowVal === 'string' && rowVal.includes(String(value));
          default: return true;
        }
      });
    }

    case 'select_columns': {
      const selectedFields = operation.settings.selectedFields || [];
      if (selectedFields.length === 0) return rows;
      return rows.map(row => {
        const newRow: MockRow = {};
        selectedFields.forEach((f: string) => { newRow[f] = row[f]; });
        return newRow;
      });
    }

    case 'sort': {
      const conditions = operation.settings.conditions || [];
      if (conditions.length === 0) return rows;
      return [...rows].sort((a, b) => {
        for (const cond of conditions) {
          const aVal = a[cond.field];
          const bVal = b[cond.field];
          const cmp = aVal == null ? 1 : bVal == null ? -1 : aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          if (cmp !== 0) return cond.direction === 'desc' ? -cmp : cmp;
        }
        return 0;
      });
    }

    case 'deduplication': {
      const columns = operation.settings.columns || [];
      if (columns.length === 0) return rows;
      const seen = new Set<string>();
      return rows.filter(row => {
        const key = columns.map((c: string) => String(row[c] ?? '')).join('||');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    case 'handle_missing_values': {
      const { strategy, columns, fillValue } = operation.settings;
      if (strategy === 'drop') {
        const cols: string[] = columns || [];
        if (cols.length === 0) return rows;
        return rows.filter(row => cols.every((c: string) => row[c] != null));
      }
      if (strategy === 'fill') {
        const cols: string[] = columns || [];
        return rows.map(row => {
          const newRow = { ...row };
          cols.forEach((c: string) => {
            if (row[c] == null) newRow[c] = fillValue ?? 'N/A';
          });
          return newRow;
        });
      }
      return rows;
    }

    case 'union':
    case 'join':
    case 'group_by':
    case 'no_op':
    default:
      return rows;
  }
}

const MAX_PREVIEW_ROWS = 50;

export interface PipelinePreviewResult {
  columns: { name: string; type: string }[];
  rows: MockRow[];
  totalRows: number;
  previewRowCount: number;
  nodeChain: string[];
  appliedOperations: string[];
}

// Execute pipeline from source to target node
export function executePipelinePreview(nodeId: string, nodes: PipelineNode[], connectors: Connector[]): PipelinePreviewResult | null {
  const targetNode = nodes.find(n => n.id === nodeId);
  if (!targetNode) return null;

  // For sources, just show their mock data
  if (targetNode.type === 'source') {
    const baseData = getMockDataForNode(targetNode.name, targetNode.type);
    if (!baseData) return null;
    return {
      columns: baseData.columns,
      rows: baseData.rows.slice(0, MAX_PREVIEW_ROWS),
      totalRows: baseData.rowCount,
      previewRowCount: Math.min(baseData.rows.length, MAX_PREVIEW_ROWS),
      nodeChain: [targetNode.name],
      appliedOperations: [],
    };
  }

  // Find upstream source
  const upstreamSource = getUpstreamSource(nodeId, nodes, connectors);
  if (!upstreamSource) return null;

  // Get mock data from source
  const baseData = getMockDataForNode(upstreamSource.name, upstreamSource.type);
  if (!baseData) return null;

  // Build execution chain: source → ... → target
  const chain = buildExecutionChain(upstreamSource.id, nodeId, nodes, connectors);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  let rows = [...baseData.rows];
  const appliedOps: string[] = [];

  for (const nid of chain) {
    const node = nodeMap.get(nid);
    if (!node || node.id === upstreamSource.id) continue;

    const beforeCount = rows.length;
    rows = applyOperation(rows, node.operation);
    const afterCount = rows.length;

    if (node.operation) {
      const desc = describeOperation(node.operation, node.name);
      appliedOps.push(`${desc} (${beforeCount} → ${afterCount} rows)`);
    }
  }

  // Determine output columns
  const outputFields = targetNode.outputFields?.length ? targetNode.outputFields : baseData.columns;

  return {
    columns: outputFields,
    rows: rows.slice(0, MAX_PREVIEW_ROWS),
    totalRows: rows.length,
    previewRowCount: Math.min(rows.length, MAX_PREVIEW_ROWS),
    nodeChain: chain.map(id => nodeMap.get(id)?.name ?? id),
    appliedOperations: appliedOps,
  };
}

function buildExecutionChain(sourceId: string, targetId: string, nodes: PipelineNode[], connectors: Connector[]): string[] {
  const visited = new Set<string>();

  function bfs(from: string, to: string): string[] {
    const queue: { nodeId: string; path: string[] }[] = [{ nodeId: from, path: [from] }];

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      if (nodeId === to) return path;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const outgoing = connectors.filter(c => c.from === nodeId);
      for (const conn of outgoing) {
        if (!visited.has(conn.to)) {
          queue.push({ nodeId: conn.to, path: [...path, conn.to] });
        }
      }
    }
    return [];
  }

  return bfs(sourceId, targetId);
}

function describeOperation(op: Operation, nodeName: string): string {
  switch (op.type) {
    case 'filter': {
      const { field, operator, value } = op.settings;
      return `Filter: ${field} ${operator} ${value}`;
    }
    case 'select_columns': {
      const fields = (op.settings.selectedFields || []).join(', ');
      return `Select: ${fields || 'none'}`;
    }
    case 'sort': {
      const conds = (op.settings.conditions || []).map((c: any) => `${c.field} ${c.direction}`).join(', ');
      return `Sort: ${conds}`;
    }
    case 'deduplication': {
      const cols = (op.settings.columns || []).join(', ');
      return `Dedup by: ${cols || 'all'}`;
    }
    case 'handle_missing_values':
      return `Missing: ${op.settings.strategy}`;
    case 'no_op':
      return 'Pass-through';
    default:
      return `${op.type}: ${nodeName}`;
  }
}
