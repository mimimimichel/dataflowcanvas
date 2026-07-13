import { describe, it, expect } from 'vitest';
import { generateDbtProject } from '../dbt-generator';
import { makeNode, simplePipeline, CUSTOMER_FIELDS } from './helpers';

describe('generateDbtProject', () => {
  it('returns a placeholder for an empty canvas', () => {
    expect(generateDbtProject([], [])).toContain('No nodes defined');
  });

  it('declares sources and one model per transformation, referencing dbt source()', () => {
    const { nodes, connectors } = simplePipeline({
      type: 'filter',
      settings: { field: 'amount', operator: '>', value: 100 },
    });
    const out = generateDbtProject(nodes, connectors);
    expect(out).toContain('- name: customer_db');
    expect(out).toContain('identifier: "/raw/customers"');
    expect(out).toContain('models/my_transform.sql');
    expect(out).toContain(`{{ source('pipeline', 'customer_db') }}`);
    expect(out).toContain('WHERE amount > 100');
  });

  it('emits not_null tests for non-nullable fields and pii meta in schema.yml', () => {
    const { nodes, connectors } = simplePipeline({ type: 'no_op', settings: {} });
    nodes[1].outputFields = [
      { name: 'id', type: 'integer', nullable: false },
      { name: 'email', type: 'string', classification: 'pii' },
    ];
    const out = generateDbtProject(nodes, connectors);
    expect(out).toContain('tests: [not_null]');
    expect(out).toContain('classification: pii');
  });

  it('renders a selected SQL pattern with its params substituted', () => {
    const { nodes, connectors } = simplePipeline({
      type: 'sql_pattern',
      settings: { patternId: 'dedup_by_key', params: { key_columns: 'id', source_table: 'raw.users', timestamp_col: 'updated_at' } },
    });
    const out = generateDbtProject(nodes, connectors);
    expect(out).toContain('SELECT DISTINCT ON (id)');
    expect(out).toContain('ORDER BY id, updated_at DESC');
  });

  it('maps full joins to FULL OUTER', () => {
    const left = makeNode({ id: 'l', name: 'Left', type: 'source', location: '/l', outputFields: CUSTOMER_FIELDS });
    const right = makeNode({ id: 'r', name: 'Right', type: 'source', location: '/r', outputFields: CUSTOMER_FIELDS });
    const join = makeNode({
      id: 'j', name: 'Join', type: 'transformation',
      operation: { type: 'join', settings: { leftNodeId: 'l', rightNodeId: 'r', joinType: 'full', condition: { leftField: 'id', rightField: 'id' } } },
    });
    const out = generateDbtProject([left, right, join], [{ from: 'l', to: 'j' }, { from: 'r', to: 'j' }]);
    expect(out).toContain('FULL OUTER JOIN');
    expect(out).toContain('ON a.id = b.id');
  });

  it('unions all parents with UNION ALL', () => {
    const a = makeNode({ id: 'a', name: 'A', type: 'source', location: '/a' });
    const b = makeNode({ id: 'b', name: 'B', type: 'source', location: '/b' });
    const u = makeNode({ id: 'u', name: 'U', type: 'transformation', operation: { type: 'union', settings: {} } });
    const out = generateDbtProject([a, b, u], [{ from: 'a', to: 'u' }, { from: 'b', to: 'u' }]);
    expect(out).toContain('UNION ALL');
  });
});
