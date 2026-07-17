import { describe, it, expect } from 'vitest';
import { propagateSchema, executePipelinePreview } from '../pipeline-executor';
import { makeNode } from './helpers';
import type { Field } from '../pipeline-data';

const CUSTOMER_FIELDS: Field[] = [
  { name: 'id', type: 'integer' },
  { name: 'email', type: 'string' },
];

const ORDER_FIELDS: Field[] = [
  { name: 'order_id', type: 'integer' },
  { name: 'customer_id', type: 'integer' },
  { name: 'amount', type: 'float' },
];

describe('propagateSchema — join left/right derivation', () => {
  it('derives leftNodeId/rightNodeId from the join node\'s own incoming connectors when unset', () => {
    const customers = makeNode({ id: 'customers', type: 'source', outputFields: CUSTOMER_FIELDS });
    const orders = makeNode({ id: 'orders', type: 'source', outputFields: ORDER_FIELDS });
    const join = makeNode({
      id: 'join',
      type: 'transformation',
      operation: { type: 'join', settings: { leftNodeId: '', rightNodeId: '', joinType: 'inner', condition: { leftField: '', rightField: '' } } },
    });

    const result = propagateSchema(
      [customers, orders, join],
      [{ from: 'customers', to: 'join' }, { from: 'orders', to: 'join' }]
    );

    const joinResult = result.find(n => n.id === 'join')!;
    const settings = (joinResult.operation as any).settings;
    expect(settings.leftNodeId).toBe('customers');
    expect(settings.rightNodeId).toBe('orders');
    // Output combines both sides' fields, proving the join is now actually configured.
    expect(joinResult.outputFields).toEqual([...CUSTOMER_FIELDS, ...ORDER_FIELDS]);
  });

  it('keeps an already-valid leftNodeId/rightNodeId untouched', () => {
    const customers = makeNode({ id: 'customers', type: 'source', outputFields: CUSTOMER_FIELDS });
    const orders = makeNode({ id: 'orders', type: 'source', outputFields: ORDER_FIELDS });
    const join = makeNode({
      id: 'join',
      type: 'transformation',
      operation: { type: 'join', settings: { leftNodeId: 'orders', rightNodeId: 'customers', joinType: 'inner', condition: { leftField: '', rightField: '' } } },
    });

    const result = propagateSchema(
      [customers, orders, join],
      [{ from: 'customers', to: 'join' }, { from: 'orders', to: 'join' }]
    );

    const settings = (result.find(n => n.id === 'join')!.operation as any).settings;
    expect(settings.leftNodeId).toBe('orders');
    expect(settings.rightNodeId).toBe('customers');
  });

  it('is a no-op (same array reference) once converged', () => {
    const customers = makeNode({ id: 'customers', type: 'source', outputFields: CUSTOMER_FIELDS });
    const orders = makeNode({ id: 'orders', type: 'source', outputFields: ORDER_FIELDS });
    const join = makeNode({
      id: 'join',
      type: 'transformation',
      operation: { type: 'join', settings: { leftNodeId: '', rightNodeId: '', joinType: 'inner', condition: { leftField: '', rightField: '' } } },
    });
    const nodes = [customers, orders, join];
    const connectors = [{ from: 'customers', to: 'join' }, { from: 'orders', to: 'join' }];

    const first = propagateSchema(nodes, connectors);
    const second = propagateSchema(first, connectors);
    expect(second).toBe(first);
  });
});

describe('propagateSchema — other operation types', () => {
  const CUSTOMER_FIELDS: Field[] = [
    { name: 'id', type: 'integer' },
    { name: 'region', type: 'string' },
    { name: 'amount', type: 'float' },
  ];

  it('group_by: output is groupByFields + aggregation results, named per aggregation.newName', () => {
    const source = makeNode({ id: 'src', type: 'source', outputFields: CUSTOMER_FIELDS });
    const groupBy = makeNode({
      id: 'gb',
      type: 'transformation',
      operation: {
        type: 'group_by',
        settings: {
          groupByFields: ['region'],
          aggregations: [{ field: 'amount', type: 'sum', newName: 'total_amount' }],
        },
      },
    });

    const result = propagateSchema([source, groupBy], [{ from: 'src', to: 'gb' }]);
    const gbResult = result.find(n => n.id === 'gb')!;

    expect(gbResult.inputFields).toEqual(CUSTOMER_FIELDS);
    expect(gbResult.outputFields).toEqual([
      { name: 'region', type: 'string' },
      { name: 'total_amount', type: 'float' },
    ]);
  });

  it('select_columns: output keeps only the selected fields, in inputFields order', () => {
    const source = makeNode({ id: 'src', type: 'source', outputFields: CUSTOMER_FIELDS });
    const select = makeNode({
      id: 'sel',
      type: 'transformation',
      operation: { type: 'select_columns', settings: { selectedFields: ['amount', 'id'] } },
    });

    const result = propagateSchema([source, select], [{ from: 'src', to: 'sel' }]);
    const selResult = result.find(n => n.id === 'sel')!;

    expect(selResult.outputFields).toEqual([
      { name: 'id', type: 'integer' },
      { name: 'amount', type: 'float' },
    ]);
  });

  it.each(['sort', 'deduplication', 'handle_missing_values', 'no_op'])(
    '%s: output schema passes inputFields through unchanged',
    (opType) => {
      const source = makeNode({ id: 'src', type: 'source', outputFields: CUSTOMER_FIELDS });
      const node = makeNode({
        id: 'op',
        type: 'transformation',
        operation: { type: opType, settings: {} } as any,
      });

      const result = propagateSchema([source, node], [{ from: 'src', to: 'op' }]);
      const opResult = result.find(n => n.id === 'op')!;

      expect(opResult.inputFields).toEqual(CUSTOMER_FIELDS);
      expect(opResult.outputFields).toEqual(CUSTOMER_FIELDS);
    }
  );

  it('destination: schema is derived (inputFields = outputFields, no operation of its own)', () => {
    const source = makeNode({ id: 'src', type: 'source', outputFields: CUSTOMER_FIELDS });
    const dest = makeNode({ id: 'dst', type: 'destination' });

    const result = propagateSchema([source, dest], [{ from: 'src', to: 'dst' }]);
    const destResult = result.find(n => n.id === 'dst')!;

    expect(destResult.inputFields).toEqual(CUSTOMER_FIELDS);
    expect(destResult.outputFields).toEqual(CUSTOMER_FIELDS);
  });

  it('dataset: never overwrites the user-authored inputFields ("Dataset Schema"), even with no upstream connection', () => {
    const customField: Field[] = [{ name: 'custom_metric', type: 'float' }];
    const dataset = makeNode({ id: 'ds', type: 'dataset', inputFields: customField });

    const result = propagateSchema([dataset], []);
    const dsResult = result.find(n => n.id === 'ds')!;

    expect(dsResult.inputFields).toEqual(customField);
    expect(dsResult.outputFields).toEqual(customField);
  });
});

describe('executePipelinePreview — real uploaded data vs. demo mock data', () => {
  it('prefers a source\'s real sampleData over the keyword-matched demo dataset', () => {
    const uploaded = [{ city: 'ZZZ_TEST_CITY', population: 42 }];
    const source = makeNode({
      id: 'src',
      name: 'Customer DB', // would normally keyword-match the demo customer dataset
      type: 'source',
      outputFields: [{ name: 'city', type: 'string' }, { name: 'population', type: 'integer' }],
      sampleData: uploaded,
    });

    const preview = executePipelinePreview('src', [source], []);

    expect(preview).not.toBeNull();
    expect(preview!.rows).toEqual(uploaded);
    expect(preview!.totalRows).toBe(1);
  });

  it('falls back to the demo dataset when no sampleData has been uploaded', () => {
    const source = makeNode({ id: 'src', name: 'Customer DB', type: 'source' });

    const preview = executePipelinePreview('src', [source], []);

    expect(preview).not.toBeNull();
    expect(preview!.rows.length).toBeGreaterThan(0);
    expect(preview!.rows).not.toEqual([]);
  });

  it('returns null for a source whose name matches no demo dataset and has no uploaded sample', () => {
    const source = makeNode({ id: 'src', name: 'Some Unrecognized Source Name', type: 'source' });

    const preview = executePipelinePreview('src', [source], []);

    expect(preview).toBeNull();
  });
});
