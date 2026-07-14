import type { PipelineNode, Connector } from './pipeline-data';

export const NODE_WIDTH = 256;

const SCHEMA_MAX_ROWS = 8;
const SCHEMA_ROW_HEIGHT = 19;

/**
 * Deterministic estimate of a node card's rendered height, calibrated on
 * node.tsx: header row, system/location chips, quality metrics strip,
 * schema overview (capped at 8 rows) or operation preview, bottom padding.
 * Used for layout and collision detection — a safety gap is applied on
 * top by callers, so this only needs to be in the right ballpark.
 */
export function estimateNodeHeight(node: PipelineNode): number {
  let height = 70; // header (icon, name, badges, action buttons)

  if (node.type !== 'transformation') {
    if (node.system) height += 28;
    if (node.location) height += 28;
  }
  if (node.qualityMetrics && (node.qualityMetrics.completeness !== undefined || node.qualityMetrics.freshness)) {
    height += 56;
  }

  if (node.type === 'transformation') {
    const op = node.operation;
    if (!op || op.type === 'no_op') {
      const rows = Math.min((node.inputFields || []).length, SCHEMA_MAX_ROWS);
      height += rows > 0 ? 20 + rows * SCHEMA_ROW_HEIGHT : 40;
    } else if (op.type === 'join') {
      height += 140; // join card: two source chips + condition line
    } else {
      height += 100; // filter/sort/aggregate/... preview block
    }
  } else {
    const fields = node.type === 'source' ? node.outputFields : node.inputFields;
    const rows = Math.min((fields || []).length, SCHEMA_MAX_ROWS);
    height += rows > 0 ? 20 + rows * SCHEMA_ROW_HEIGHT : 40;
  }

  return height + 16; // bottom padding / port clearance
}

export interface NodeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function nodeBox(node: PipelineNode): NodeBox {
  return { x: node.position.x, y: node.position.y, width: NODE_WIDTH, height: estimateNodeHeight(node) };
}

export function boxesIntersect(a: NodeBox, b: NodeBox, margin = 0): boolean {
  return a.x < b.x + b.width + margin &&
         a.x + a.width + margin > b.x &&
         a.y < b.y + b.height + margin &&
         a.y + a.height + margin > b.y;
}

const H_GAP = 180;   // horizontal space between column edges (room for connectors)
const V_GAP = 60;    // vertical space between stacked cards
const PADDING = 200; // top-left origin

/**
 * Overlap-free layered layout: nodes are placed in columns by topological
 * level, and stacked cumulatively within a column using their estimated
 * heights — no fixed row pitch, so long-schema cards can't spill onto the
 * next one. Column order inside a level groups nodes by groupId then name,
 * preserving the previous auto-layout's visual grouping.
 */
export function layoutPipeline(nodes: PipelineNode[], connectors: Connector[]): PipelineNode[] {
  if (nodes.length === 0) return nodes;

  const levels: Record<string, number> = {};
  const getLevel = (nodeId: string, visited = new Set<string>()): number => {
    if (levels[nodeId] !== undefined) return levels[nodeId];
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);
    const incoming = connectors.filter(c => c.to === nodeId);
    if (incoming.length === 0) { levels[nodeId] = 0; return 0; }
    const level = Math.max(...incoming.map(c => getLevel(c.from, visited))) + 1;
    levels[nodeId] = level;
    return level;
  };
  nodes.forEach(n => getLevel(n.id));

  const levelGroups: Record<number, PipelineNode[]> = {};
  nodes.forEach(n => {
    const level = levels[n.id] || 0;
    (levelGroups[level] ||= []).push(n);
  });
  Object.values(levelGroups).forEach(group => {
    group.sort((a, b) => {
      const groupCompare = (a.groupId || '').localeCompare(b.groupId || '');
      if (groupCompare !== 0) return groupCompare;
      return a.name.localeCompare(b.name);
    });
  });

  const positions = new Map<string, { x: number; y: number }>();
  Object.entries(levelGroups).forEach(([levelStr, group]) => {
    const level = parseInt(levelStr, 10);
    const x = PADDING + level * (NODE_WIDTH + H_GAP);
    let y = PADDING;
    group.forEach(node => {
      positions.set(node.id, { x, y });
      y += estimateNodeHeight(node) + V_GAP;
    });
  });

  return nodes.map(n => ({ ...n, position: positions.get(n.id) || n.position }));
}

/**
 * Returns the desired position if free, otherwise the nearest lower spot
 * whose bounding box doesn't intersect any existing card.
 */
export function findFreePosition(
  existingNodes: PipelineNode[],
  desired: { x: number; y: number },
  newNode: Pick<PipelineNode, 'type' | 'operation' | 'inputFields' | 'outputFields' | 'system' | 'location' | 'qualityMetrics'>,
): { x: number; y: number } {
  const height = estimateNodeHeight(newNode as PipelineNode);
  const boxes = existingNodes.map(nodeBox);
  const candidate = { ...desired };

  const collides = () => boxes.some(b => boxesIntersect({ x: candidate.x, y: candidate.y, width: NODE_WIDTH, height }, b, 24));

  let guard = 0;
  while (collides() && guard < 200) {
    candidate.y += 40;
    guard++;
  }
  return candidate;
}
