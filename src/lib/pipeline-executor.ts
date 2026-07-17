// Simulate pipeline data flow — applies mock transformations to preview data
import type { MockRow, MockDataset } from '@/lib/mock-data';
import { getMockDataForNode } from '@/lib/mock-data';
import { deriveOutputFields, type PipelineNode, type Connector, type Operation, type Field } from '@/lib/pipeline-data';

function fieldsEqual(a: Field[] = [], b: Field[] = []): boolean {
  return a.length === b.length && a.every((f, i) => f.name === b[i].name && f.type === b[i].type);
}

// Topological order (sources first) so each node's inputFields is derived after
// every node feeding into it has already had its own outputFields resolved.
// Falls back to array order for any node caught in a cycle, rather than looping.
function topoOrder(nodes: PipelineNode[], connectors: Connector[]): PipelineNode[] {
  const levels = new Map<string, number>();
  const visiting = new Set<string>();

  function levelOf(nodeId: string): number {
    if (levels.has(nodeId)) return levels.get(nodeId)!;
    if (visiting.has(nodeId)) return 0; // cycle guard
    visiting.add(nodeId);
    const incoming = connectors.filter(c => c.to === nodeId);
    const level = incoming.length === 0 ? 0 : Math.max(...incoming.map(c => levelOf(c.from))) + 1;
    visiting.delete(nodeId);
    levels.set(nodeId, level);
    return level;
  }

  return [...nodes].sort((a, b) => levelOf(a.id) - levelOf(b.id));
}

// Keeps every node's schema consistent with what actually flows into it: inputFields
// is always the union of the upstream nodes' outputFields (via the connector graph),
// and outputFields is re-derived from that using the node's own operation (pass-
// through, filter, join, group by, select columns...). Source nodes are the one
// exception — their outputFields is user-authored (SchemaEditor / sample upload),
// never derived from anything upstream.
//
// This is meant to run after every nodes/connectors change so a schema edit
// anywhere (renaming a field, uploading new sample data, reconfiguring an
// operation) ripples through the whole downstream chain automatically, not just
// at the moment two nodes get connected. Returns the same array reference when
// nothing actually changed, so callers can cheaply no-op on convergence.
export function propagateSchema(nodes: PipelineNode[], connectors: Connector[]): PipelineNode[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  let changed = false;

  for (const node of topoOrder(nodes, connectors)) {
    // Sources' outputFields and datasets' inputFields ("Dataset Schema" in the
    // config panel) are the two user-authored schemas in the app — never derive
    // over them, or a manual edit gets silently reverted on the next render.
    if (node.type === 'source') continue;

    if (node.type === 'dataset') {
      const inputFields = node.inputFields || [];
      if (!fieldsEqual(inputFields, node.outputFields)) {
        nodeMap.set(node.id, { ...node, outputFields: inputFields });
        changed = true;
      }
      continue;
    }

    const upstreamFields = new Map<string, Field>();
    connectors.filter(c => c.to === node.id).forEach(c => {
      nodeMap.get(c.from)?.outputFields?.forEach(f => upstreamFields.set(f.name, f));
    });
    const inputFields = Array.from(upstreamFields.values());
    const outputFields = deriveOutputFields(node.operation, inputFields, nodes);

    if (!fieldsEqual(inputFields, node.inputFields) || !fieldsEqual(outputFields, node.outputFields)) {
      nodeMap.set(node.id, { ...node, inputFields, outputFields });
      changed = true;
    }
  }

  return changed ? nodes.map(n => nodeMap.get(n.id)!) : nodes;
}

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

// A source's real uploaded rows (if any) are the ground truth for its preview —
// only fall back to the keyword-matched demo dataset when nothing has been
// uploaded yet. Without this, uploading a CSV updated the node's own schema/row
// count badge but the preview panel kept showing the unrelated canned dataset.
function sourceDataFor(node: PipelineNode): MockDataset | null {
  if (node.sampleData?.length) {
    return {
      columns: node.outputFields?.length
        ? node.outputFields
        : Object.keys(node.sampleData[0]).map(name => ({ name, type: typeof node.sampleData![0][name] })),
      rows: node.sampleData as MockRow[],
      rowCount: node.sampleData.length,
    };
  }
  return getMockDataForNode(node.name, node.type);
}

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

  // For sources, just show their (real or demo) data
  if (targetNode.type === 'source') {
    const baseData = sourceDataFor(targetNode);
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

  // Get data from source
  const baseData = sourceDataFor(upstreamSource);
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
