import { describe, it, expect } from 'vitest';
import { propagateSchema } from '../pipeline-executor';
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
