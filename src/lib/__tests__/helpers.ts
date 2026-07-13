import type { PipelineNode, Connector, Operation, NodeType, Field } from '../pipeline-data';

let counter = 0;

export function makeNode(partial: Partial<PipelineNode> & { type: NodeType }): PipelineNode {
  counter++;
  return {
    id: partial.id || `${partial.type}-${counter}`,
    name: partial.name || `${partial.type} ${counter}`,
    position: { x: 0, y: 0 },
    ...partial,
  };
}

export const CUSTOMER_FIELDS: Field[] = [
  { name: 'id', type: 'integer', nullable: false },
  { name: 'email', type: 'string' },
  { name: 'amount', type: 'float' },
];

/** source -> transformation(op) -> destination, wired with connectors. */
export function simplePipeline(op: Operation | undefined): { nodes: PipelineNode[]; connectors: Connector[] } {
  const source = makeNode({ id: 'src', name: 'Customer DB', type: 'source', location: '/raw/customers', system: 'PostgreSQL', outputFields: CUSTOMER_FIELDS });
  const transform = makeNode({ id: 'tr', name: 'My Transform', type: 'transformation', operation: op, inputFields: CUSTOMER_FIELDS, outputFields: CUSTOMER_FIELDS });
  const dest = makeNode({ id: 'dst', name: 'Warehouse', type: 'destination', location: '/out/customers' });
  return {
    nodes: [source, transform, dest],
    connectors: [{ from: 'src', to: 'tr' }, { from: 'tr', to: 'dst' }],
  };
}
