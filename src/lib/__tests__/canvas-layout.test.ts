import { describe, it, expect } from 'vitest';
import { estimateNodeHeight, layoutPipeline, findFreePosition, nodeBox, boxesIntersect, NODE_WIDTH } from '../canvas-layout';
import { makeNode } from './helpers';
import { ALL_TEMPLATES } from '../pipeline-templates';

function assertNoOverlap(nodes: ReturnType<typeof layoutPipeline>) {
  const boxes = nodes.map(nodeBox);
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(boxesIntersect(boxes[i], boxes[j])).toBe(false);
    }
  }
}

describe('estimateNodeHeight', () => {
  it('grows with the number of schema fields, capped at 8 rows', () => {
    const small = makeNode({ type: 'source', outputFields: [{ name: 'a', type: 'string' }] });
    const many = makeNode({ type: 'source', outputFields: Array.from({ length: 20 }, (_, i) => ({ name: `f${i}`, type: 'string' })) });
    const heightSmall = estimateNodeHeight(small);
    const heightMany = estimateNodeHeight(many);
    expect(heightMany).toBeGreaterThan(heightSmall);

    const atCap = makeNode({ type: 'source', outputFields: Array.from({ length: 8 }, (_, i) => ({ name: `f${i}`, type: 'string' })) });
    expect(estimateNodeHeight(atCap)).toBe(heightMany);
  });

  it('accounts for system/location chips and quality metrics', () => {
    const bare = makeNode({ type: 'source', outputFields: [] });
    const rich = makeNode({ type: 'source', outputFields: [], system: 'PostgreSQL', location: '/db', qualityMetrics: { completeness: 99, freshness: '1h' } });
    expect(estimateNodeHeight(rich)).toBeGreaterThan(estimateNodeHeight(bare));
  });
});

describe('layoutPipeline', () => {
  it('produces no overlap on a synthetic pipeline with long schemas', () => {
    const bigFields = Array.from({ length: 15 }, (_, i) => ({ name: `field_${i}`, type: 'string' }));
    const source = makeNode({ id: 's1', type: 'source', outputFields: bigFields, groupId: 'g1' });
    const source2 = makeNode({ id: 's2', type: 'source', outputFields: bigFields, groupId: 'g1' });
    const t1 = makeNode({ id: 't1', type: 'transformation', operation: { type: 'join', settings: { leftNodeId: 's1', rightNodeId: 's2', joinType: 'inner', condition: { leftField: 'id', rightField: 'id' } } }, inputFields: bigFields, outputFields: bigFields });
    const t2 = makeNode({ id: 't2', type: 'transformation', operation: { type: 'deduplication', settings: { columns: ['id'] } }, inputFields: bigFields, outputFields: bigFields });
    const dest = makeNode({ id: 'd1', type: 'destination', inputFields: bigFields });

    const laidOut = layoutPipeline([source, source2, t1, t2, dest], [
      { from: 's1', to: 't1' }, { from: 's2', to: 't1' }, { from: 't1', to: 't2' }, { from: 't2', to: 'd1' },
    ]);
    assertNoOverlap(laidOut);
  });

  it('handles disconnected nodes and cycles without throwing', () => {
    const a = makeNode({ id: 'a', type: 'source' });
    const b = makeNode({ id: 'b', type: 'transformation', operation: { type: 'no_op', settings: {} } });
    const c = makeNode({ id: 'c', type: 'transformation', operation: { type: 'no_op', settings: {} } });
    const laidOut = layoutPipeline([a, b, c], [{ from: 'b', to: 'c' }, { from: 'c', to: 'b' }]);
    assertNoOverlap(laidOut);
  });

  it('returns the input unchanged for an empty pipeline', () => {
    expect(layoutPipeline([], [])).toEqual([]);
  });

  it('produces no overlap for every shipped pipeline template', () => {
    ALL_TEMPLATES.forEach(template => {
      const laidOut = layoutPipeline(template.nodes, template.connectors);
      assertNoOverlap(laidOut);
    });
  });
});

describe('findFreePosition', () => {
  it('keeps the desired position when nothing is there', () => {
    const pos = findFreePosition([], { x: 100, y: 100 }, { type: 'source', outputFields: [] });
    expect(pos).toEqual({ x: 100, y: 100 });
  });

  it('moves down until the new box no longer intersects an existing card', () => {
    const existing = makeNode({ id: 'e', type: 'source', position: { x: 100, y: 100 }, outputFields: [{ name: 'a', type: 'string' }] });
    const pos = findFreePosition([existing], { x: 100, y: 100 }, { type: 'source', outputFields: [{ name: 'a', type: 'string' }] });
    const box = { x: pos.x, y: pos.y, width: NODE_WIDTH, height: estimateNodeHeight(existing) };
    expect(boxesIntersect(box, nodeBox(existing))).toBe(false);
  });

  it('never returns a colliding position across many pre-placed cards', () => {
    const existing = Array.from({ length: 10 }, (_, i) =>
      makeNode({ id: `e${i}`, type: 'source', position: { x: 100, y: 100 + i * 30 }, outputFields: [{ name: 'a', type: 'string' }] })
    );
    const pos = findFreePosition(existing, { x: 100, y: 100 }, { type: 'source', outputFields: [] });
    const box = { x: pos.x, y: pos.y, width: NODE_WIDTH, height: estimateNodeHeight({ type: 'source', outputFields: [] } as any) };
    existing.forEach(e => expect(boxesIntersect(box, nodeBox(e))).toBe(false));
  });
});
