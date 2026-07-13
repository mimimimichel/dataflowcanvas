import { describe, it, expect } from 'vitest';
import { generatePythonCode } from '../python-generator';
import { makeNode, simplePipeline, CUSTOMER_FIELDS } from './helpers';

describe('generatePythonCode', () => {
  it('returns a placeholder for an empty canvas', () => {
    expect(generatePythonCode([], [])).toContain('No nodes defined');
  });

  it('generates a transform_df skeleton with inputs, filter and return', () => {
    const { nodes, connectors } = simplePipeline({
      type: 'filter',
      settings: { field: 'email', operator: '==', value: 'a@b.c' },
    });
    const code = generatePythonCode(nodes, connectors);
    expect(code).toContain('@transform_df(');
    expect(code).toContain('Output("/out/customers")');
    expect(code).toContain('customer_db=Input("/raw/customers")');
    expect(code).toContain('def compute(customer_db):');
    expect(code).toContain(`F.col("email") == 'a@b.c'`);
    expect(code).toContain('return my_transform');
  });

  it('generates a join between two parents on the configured condition', () => {
    const left = makeNode({ id: 'l', name: 'Left', type: 'source', location: '/l', outputFields: CUSTOMER_FIELDS });
    const right = makeNode({ id: 'r', name: 'Right', type: 'source', location: '/r', outputFields: CUSTOMER_FIELDS });
    const join = makeNode({
      id: 'j', name: 'Join', type: 'transformation',
      operation: { type: 'join', settings: { leftNodeId: 'l', rightNodeId: 'r', joinType: 'left', condition: { leftField: 'id', rightField: 'customer_id' } } },
    });
    const code = generatePythonCode([left, right, join], [{ from: 'l', to: 'j' }, { from: 'r', to: 'j' }]);
    expect(code).toContain('left.join(');
    expect(code).toContain('F.col("left.id") == F.col("right.customer_id")');
    expect(code).toContain('how="left"');
  });

  it('emits a chained F.when for fix_typos mappings (regression: object is not an array)', () => {
    const { nodes, connectors } = simplePipeline({
      type: 'fix_typos',
      settings: { mapping: { country: { Frnace: 'France', Grmany: 'Germany' } } },
    });
    const code = generatePythonCode(nodes, connectors);
    expect(code).toContain('.when(F.col("country") == "Frnace", "France")');
    expect(code).toContain('.when(F.col("country") == "Grmany", "Germany")');
    expect(code).toContain('.otherwise(F.col("country"))');
  });

  it('deduplicates on the configured columns', () => {
    const { nodes, connectors } = simplePipeline({ type: 'deduplication', settings: { columns: ['id', 'email'] } });
    expect(generatePythonCode(nodes, connectors)).toContain('dropDuplicates(["id", "email"])');
  });

  it('unions all parents with unionByName', () => {
    const a = makeNode({ id: 'a', name: 'A', type: 'source', location: '/a' });
    const b = makeNode({ id: 'b', name: 'B', type: 'source', location: '/b' });
    const u = makeNode({ id: 'u', name: 'U', type: 'transformation', operation: { type: 'union', settings: {} } });
    const code = generatePythonCode([a, b, u], [{ from: 'a', to: 'u' }, { from: 'b', to: 'u' }]);
    expect(code).toContain('.unionByName(b)');
  });
});
