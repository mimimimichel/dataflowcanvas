import type { Icon } from 'lucide-react';
import { Database, Filter, Combine, BarChart3, DatabaseZap } from 'lucide-react';
import type { NodeType, NodeStatus } from '@/components/data-flow/node';

export interface PipelineNode {
  id: string;
  name: string;
  type: NodeType;
  status: NodeStatus;
  quality: number;
  position: { x: number; y: number };
}

export const nodes: PipelineNode[] = [
  { id: 'source-1', name: 'Customer DB', type: 'source', status: 'healthy', quality: 99, position: { x: 50, y: 150 } },
  { id: 'transform-1', name: 'Filter Inactive', type: 'transformation', status: 'healthy', quality: 99, position: { x: 350, y: 50 } },
  { id: 'transform-2', name: 'Join Orders', type: 'transformation', status: 'warning', quality: 92, position: { x: 350, y: 250 } },
  { id: 'transform-3', name: 'Aggregate Spend', type: 'transformation', status: 'healthy', quality: 92, position: { x: 650, y: 150 } },
  { id: 'dest-1', name: 'Data Warehouse', type: 'destination', status: 'healthy', quality: 92, position: { x: 950, y: 150 } },
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

export const transformations = {
    source: { name: 'Database Source', icon: Database },
    transform: [
        { name: 'Filter', icon: Filter },
        { name: 'Join', icon: Combine },
        { name: 'Aggregate', icon: BarChart3 },
    ],
    destination: { name: 'Data Warehouse', icon: DatabaseZap }
}
