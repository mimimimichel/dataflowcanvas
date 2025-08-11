
import type { Icon } from 'lucide-react';
import { Database, Filter, Combine, BarChart3, DatabaseZap } from 'lucide-react';
import type { NodeType, NodeStatus } from '@/components/data-flow/node';

export interface Field {
  name: string;
  type: string;
}

export interface PipelineNode {
  id: string;
  name: string;
  type: NodeType;
  status: NodeStatus;
  quality: number;
  position: { x: number; y: number };
  inputFields?: Field[];
  outputFields?: Field[];
  rule?: string;
}

export const nodes: PipelineNode[] = [
  { 
    id: 'source-1', 
    name: 'Customer DB', 
    type: 'source', 
    status: 'healthy', 
    quality: 99, 
    position: { x: 50, y: 150 },
    outputFields: [
      { name: 'id', type: 'integer' },
      { name: 'first_name', type: 'string' },
      { name: 'last_name', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'is_active', type: 'boolean' },
    ]
  },
  { 
    id: 'transform-1', 
    name: 'Filter Inactive', 
    type: 'transformation', 
    status: 'healthy', 
    quality: 99, 
    position: { x: 350, y: 50 },
    rule: "SELECT * FROM input WHERE is_active = true"
  },
  { 
    id: 'transform-2', 
    name: 'Join Orders', 
    type: 'transformation', 
    status: 'warning', 
    quality: 92, 
    position: { x: 350, y: 250 },
    rule: "SELECT *, o.order_id, o.amount FROM input c JOIN orders o ON c.id = o.customer_id"
  },
  { 
    id: 'transform-3', 
    name: 'Aggregate Spend', 
    type: 'transformation', 
    status: 'healthy', 
    quality: 92, 
    position: { x: 650, y: 150 },
    rule: "SELECT customer_id, SUM(amount) as total_spend FROM input GROUP BY customer_id"
  },
  { 
    id: 'dest-1', 
    name: 'Data Warehouse', 
    type: 'destination', 
    status: 'healthy', 
    quality: 92, 
    position: { x: 950, y: 150 } 
  },
];

export interface Connector {
  from: string;
  to: string;
}

export const connectors: Connector[] = [
  { from: 'source-1', to: 'transform-1' },
  { from: 'source-1', to: 'transform-2' },
  { from: 'transform-1', to: 'transform-3' },
  { from: 'transform-2', to: 'transform-3' },
  { from: 'transform-3', to: 'dest-1' },
];

export interface TransformationItem {
    name: string;
    icon: Icon;
    type: NodeType;
}

export const transformations = {
    source: { name: 'Database Source', icon: Database },
    transform: [
        { name: 'Filter', icon: Filter },
        { name: 'Join', icon: Combine },
        { name: 'Aggregate', icon: BarChart3 },
    ],
    destination: { name: 'Data Warehouse', icon: DatabaseZap }
}
