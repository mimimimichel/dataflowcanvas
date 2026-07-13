import { describe, it, expect } from 'vitest';
import { computeComplianceAudit } from '../compliance-audit';
import { scoreToGrade } from '../pipeline-data';
import { makeNode, simplePipeline } from './helpers';

describe('scoreToGrade', () => {
  it('maps score bands to grades', () => {
    expect(scoreToGrade(95)).toBe('A');
    expect(scoreToGrade(80)).toBe('B');
    expect(scoreToGrade(60)).toBe('C');
    expect(scoreToGrade(45)).toBe('D');
    expect(scoreToGrade(10)).toBe('E');
  });
});

describe('computeComplianceAudit', () => {
  it('flags unclassified PII-looking fields that reach a destination as critical', () => {
    const { nodes, connectors } = simplePipeline({ type: 'no_op', settings: {} });
    const result = computeComplianceAudit(nodes, connectors);
    const piiIssue = result.issues.find(i => i.dimension === 'security' && i.message.includes('email'));
    expect(piiIssue).toBeDefined();
    expect(piiIssue!.severity).toBe('critical');
  });

  it('stops flagging PII once the field is classified', () => {
    const { nodes, connectors } = simplePipeline({ type: 'no_op', settings: {} });
    nodes.forEach(n => {
      n.outputFields = n.outputFields?.map(f => f.name === 'email' ? { ...f, classification: 'pii' as const } : f);
    });
    const result = computeComplianceAudit(nodes, connectors);
    expect(result.issues.filter(i => i.dimension === 'security')).toHaveLength(0);
    expect(result.dimensions.find(d => d.key === 'security')!.score).toBe(100);
  });

  it('detects cycles as a critical coherence issue', () => {
    const a = makeNode({ id: 'a', name: 'A', type: 'transformation', operation: { type: 'no_op', settings: {} } });
    const b = makeNode({ id: 'b', name: 'B', type: 'transformation', operation: { type: 'no_op', settings: {} } });
    const result = computeComplianceAudit([a, b], [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }]);
    expect(result.issues.some(i => i.message.includes('cycle'))).toBe(true);
  });

  it('flags disconnected nodes and joins with fewer than 2 inputs', () => {
    const src = makeNode({ id: 's', name: 'S', type: 'source' });
    const join = makeNode({ id: 'j', name: 'J', type: 'transformation', operation: { type: 'join', settings: { leftNodeId: '', rightNodeId: '', joinType: 'inner', condition: { leftField: '', rightField: '' } } } });
    const orphan = makeNode({ id: 'o', name: 'Orphan', type: 'transformation', operation: { type: 'no_op', settings: {} } });
    const result = computeComplianceAudit([src, join, orphan], [{ from: 's', to: 'j' }]);
    expect(result.issues.some(i => i.message.includes('not connected'))).toBe(true);
    expect(result.issues.some(i => i.message.includes('requires at least 2 inputs'))).toBe(true);
  });

  it('scores a documented pipeline higher than an undocumented one', () => {
    const bare = simplePipeline({ type: 'deduplication', settings: { columns: ['id'] } });
    const documented = simplePipeline({ type: 'deduplication', settings: { columns: ['id'] } });
    documented.nodes.forEach(n => { n.description = 'Documented for the audit.'; n.groupId = 'g1'; });
    const bareScore = computeComplianceAudit(bare.nodes, bare.connectors).score;
    const docScore = computeComplianceAudit(documented.nodes, documented.connectors).score;
    expect(docScore).toBeGreaterThan(bareScore);
  });

  it('weights dimensions per the published formula', () => {
    const { nodes, connectors } = simplePipeline({ type: 'no_op', settings: {} });
    const result = computeComplianceAudit(nodes, connectors);
    const expected = Math.round(result.dimensions.reduce((sum, d) => sum + d.score * d.weight, 0));
    expect(result.score).toBe(expected);
    expect(result.dimensions.reduce((s, d) => s + d.weight, 0)).toBeCloseTo(1);
  });
});
