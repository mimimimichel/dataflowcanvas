import type { Icon } from 'lucide-react';
import { 
  Database, Filter, Combine, BarChart3, DatabaseZap, Trash2, GitCommit, 
  ArrowRightLeft, Columns, Replace, CheckSquare, Rows, SortAsc, UnfoldVertical,
  ClipboardList, Plus, Minus, Divide, Sigma, CaseSensitive, CalendarDays,
  Timer, Clock, WholeWord, SpellCheck, Globe, Hash, KeyRound, Lock, GitBranch,
  Milestone, DatabaseBackup, TestTube, FileJson, GitPullRequest, Settings,
  FileText, FunctionSquare, Pilcrow, Pencil, Search, GitCompare, EyeOff,
  Fingerprint, Bot, Group, Shuffle, Blend, BoxSelect, Code, Unplug, Layers,
  Table, Activity, CheckCircle2, XCircle, Clock3, Server, Pin, Copy
} from 'lucide-react';
import type { NodeType } from '@/components/data-flow/node';

export interface Field {
  name: string;
  type: string;
}

export type DesignStatus = 'draft' | 'review' | 'ready';

export interface DataQualityMetrics {
  completeness?: number;
  freshness?: string;
  validity?: number;
}

export type OperationType = 
  | 'filter' 
  | 'join' 
  | 'group_by' 
  | 'sort' 
  | 'select_columns' 
  | 'union' 
  | 'no_op' 
  | 'deduplication' 
  | 'handle_missing_values'
  | 'normalize_formats'
  | 'fix_typos'
  | 'quality_control'
  | 'standardize_strings'
  | 'pivot_unpivot'
  | 'split_merge_columns'
  | 'transpose'
  | 'denormalize'
  | 'nested_to_flat'
  | 'array_operations'
  | string;

export interface BaseOperation {
    type: OperationType;
    settings: Record<string, any>;
}

export interface FilterOperation extends BaseOperation {
    type: 'filter';
    settings: {
        field: string;
        operator: string;
        value: string | number | boolean;
    }
}

export type JoinType = 'inner' | 'left' | 'right' | 'full';

export interface JoinOperation extends BaseOperation {
    type: 'join';
    settings: {
        leftNodeId: string;
        rightNodeId: string;
        joinType: JoinType;
        condition: {
            leftField: string;
            rightField: string;
        }
    }
}

export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface Aggregation {
    field: string;
    type: AggregationType;
    newName: string;
}

export interface GroupByOperation extends BaseOperation {
    type: 'group_by';
    settings: {
        groupByFields: string[];
        aggregations: Aggregation[];
    }
}

export type SortDirection = 'asc' | 'desc';

export interface SortCondition {
    field: string;
    direction: SortDirection;
}

export interface SortOperation extends BaseOperation {
    type: 'sort';
    settings: {
        conditions: SortCondition[];
    }
}

export interface SelectColumnsOperation extends BaseOperation {
    type: 'select_columns';
    settings: {
        selectedFields: string[];
    }
}

export interface UnionOperation extends BaseOperation {
    type: 'union';
    settings: {}
}

export interface DeduplicationOperation extends BaseOperation {
    type: 'deduplication';
    settings: {
        columns: string[];
    }
}

export interface MissingValuesOperation extends BaseOperation {
    type: 'handle_missing_values';
    settings: {
        strategy: 'drop' | 'fill';
        fillValue?: string | number | boolean;
        columns: string[];
    }
}

export type Operation = 
    | FilterOperation 
    | JoinOperation 
    | GroupByOperation 
    | SortOperation 
    | SelectColumnsOperation 
    | UnionOperation 
    | DeduplicationOperation
    | MissingValuesOperation
    | BaseOperation;

export interface PipelineNode {
  id: string;
  name: string;
  type: NodeType;
  position: { x: number; y: number };
  system?: string;
  location?: string;
  status?: DesignStatus;
  qualityMetrics?: DataQualityMetrics;
  inputFields?: Field[];
  outputFields?: Field[];
  operation?: Operation;
  groupId?: string;
}

export interface NodeGroup {
  id: string;
  name: string;
  color: string;
  position: { x: number, y: number };
  width: number;
  height: number;
  isCollapsed?: boolean;
  parentGroupId?: string;
}

export interface Connector {
  from: string;
  to: string;
}

export interface PipelineVersion {
  id: string;
  name: string;
  nodes: PipelineNode[];
  connectors: Connector[];
  groups: NodeGroup[];
}

export interface LineageInfo {
  id: string;
  name: string;
  owner: string;
  lastEdited: string;
  description: string;
  versions: PipelineVersion[];
}

export function getDefaultOperation(type: OperationType): Operation {
  switch (type) {
    case 'filter':
      return { type: 'filter', settings: { field: '', operator: '==', value: '' } };
    case 'join':
      return { type: 'join', settings: { leftNodeId: '', rightNodeId: '', joinType: 'inner', condition: { leftField: '', rightField: '' } } };
    case 'group_by':
      return { type: 'group_by', settings: { groupByFields: [], aggregations: [] } };
    case 'sort':
      return { type: 'sort', settings: { conditions: [] } };
    case 'select_columns':
      return { type: 'select_columns', settings: { selectedFields: [] } };
    case 'deduplication':
      return { type: 'deduplication', settings: { columns: [] } };
    case 'handle_missing_values':
      return { type: 'handle_missing_values', settings: { strategy: 'drop', columns: [] } };
    case 'union':
      return { type: 'union', settings: {} };
    default:
      return { type, settings: {} };
  }
}

export function getJoinOutputFields(leftNode: PipelineNode, rightNode: PipelineNode, joinType: JoinType): Field[] {
    const leftFields = leftNode.outputFields || [];
    const rightFields = rightNode.outputFields || [];
    
    const nullable = (field: Field) => ({ ...field, type: `${field.type} | null` });

    switch(joinType) {
        case 'inner':
            return [...leftFields, ...rightFields];
        case 'left':
            return [...leftFields, ...rightFields.map(nullable)];
        case 'right':
            return [...leftFields.map(nullable), ...rightFields];
        case 'full':
            return [...leftFields.map(nullable), ...rightFields.map(nullable)];
        default:
             return [...leftFields, ...rightFields];
    }
}

export const initialNodes: PipelineNode[] = [
  { 
    id: 'source-1', 
    name: 'Customer DB', 
    type: 'source', 
    position: { x: 100, y: 150 },
    system: 'PostgreSQL',
    location: 'prod-customers-db',
    status: 'ready',
    qualityMetrics: { completeness: 99.9, freshness: '1h' },
    outputFields: [
      { name: 'id', type: 'integer' },
      { name: 'first_name', type: 'string' },
      { name: 'last_name', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'is_active', type: 'boolean' },
    ],
    groupId: 'group-ingest'
  },
  { 
    id: 'source-2', 
    name: 'Orders DB', 
    type: 'source', 
    position: { x: 100, y: 450 },
    system: 'PostgreSQL',
    location: 'prod-orders-db',
    status: 'ready',
    outputFields: [
      { name: 'order_id', type: 'integer' },
      { name: 'customer_id', type: 'integer' },
      { name: 'amount', type: 'float' },
      { name: 'order_date', type: 'date' },
    ],
    groupId: 'group-ingest'
  },
  { 
    id: 'transform-1', 
    name: 'Filter Inactive', 
    type: 'transformation', 
    position: { x: 550, y: 150 },
    status: 'review',
    operation: {
        type: 'filter',
        settings: {
            field: 'is_active',
            operator: '==',
            value: true
        }
    },
    inputFields: [
      { name: 'id', type: 'integer' },
      { name: 'first_name', type: 'string' },
      { name: 'last_name', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'is_active', type: 'boolean' },
    ],
    outputFields: [
       { name: 'id', type: 'integer' },
      { name: 'first_name', type: 'string' },
      { name: 'last_name', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'is_active', type: 'boolean' },
    ],
    groupId: 'group-clean'
  },
  { 
    id: 'transform-2', 
    name: 'Join Orders', 
    type: 'transformation', 
    position: { x: 550, y: 450 },
    status: 'draft',
    operation: {
        type: 'join',
        settings: {
            leftNodeId: 'source-1',
            rightNodeId: 'source-2',
            joinType: 'inner',
            condition: {
                leftField: 'id',
                rightField: 'customer_id'
            }
        }
    },
    inputFields: [
      { name: 'id', type: 'integer' },
      { name: 'first_name', type: 'string' },
      { name: 'last_name', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'is_active', type: 'boolean' },
      { name: 'order_id', type: 'integer' },
      { name: 'customer_id', type: 'integer' },
      { name: 'amount', type: 'float' },
      { name: 'order_date', type: 'date' },
    ],
    outputFields: [
      { name: 'id', type: 'integer' },
      { name: 'first_name', type: 'string' },
      { name: 'last_name', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'is_active', type: 'boolean' },
      { name: 'order_id', type: 'integer' },
      { name: 'customer_id', type: 'integer' },
      { name: 'amount', type: 'float' },
      { name: 'order_date', type: 'date' },
    ],
    groupId: 'group-clean'
  },
];

export const initialGroups: NodeGroup[] = [
  {
    id: 'group-ingest',
    name: 'Ingestion Layer',
    color: 'blue',
    position: { x: 50, y: 100 },
    width: 350,
    height: 600,
    isCollapsed: false
  },
  {
    id: 'group-clean',
    name: 'Processing & Cleanup',
    color: 'amber',
    position: { x: 450, y: 100 },
    width: 450,
    height: 600,
    isCollapsed: false
  }
];

export const initialConnectors: Connector[] = [
  { from: 'source-1', to: 'transform-1' },
  { from: 'source-1', to: 'transform-2' },
  { from: 'source-2', to: 'transform-2' },
];

export const mockLineages: LineageInfo[] = [
  {
    id: 'lineage-1',
    name: 'Customer Revenue Pipeline',
    owner: 'Jane Doe',
    lastEdited: '2 hours ago',
    description: 'Calculates LTV based on historical orders and active customer records.',
    versions: [
      {
        id: 'v1',
        name: 'v1.0 (Production)',
        nodes: initialNodes,
        connectors: initialConnectors,
        groups: initialGroups
      }
    ]
  },
  {
    id: 'lineage-2',
    name: 'Inventory Sync',
    owner: 'John Smith',
    lastEdited: '3 days ago',
    description: 'Syncs warehouse stock levels with the external marketplace API.',
    versions: [
       { id: 'v1', name: 'v1.0', nodes: [], connectors: [], groups: [] }
    ]
  },
  {
    id: 'lineage-3',
    name: 'Marketing Leads ETL',
    owner: 'Sarah Connor',
    lastEdited: 'Yesterday',
    description: 'Normalizes inbound leads from CRM and prepares for campaign scoring.',
    versions: [
       { id: 'v1', name: 'v1.0', nodes: [], connectors: [], groups: [] }
    ]
  }
];

export interface TransformationItem {
    name: string;
    icon: Icon;
    type: NodeType;
    operationType?: OperationType;
    description?: string;
}

export interface TransformationCategory {
  category: string;
  items: TransformationItem[];
}

export const transformations = {
    sources: [
        { name: 'Database Source', icon: Database, description: "Connect to a SQL database." },
        { name: 'File Source', icon: FileText, description: "Use a file (CSV, JSON, etc.) as a source." }
    ],
    dataset: { name: 'Intermediate Dataset', icon: Layers, description: "Store intermediate results of a pipeline." },
    destination: { name: 'Data Warehouse', icon: DatabaseZap, description: "Load data into a data warehouse." },
    common: [
        { name: 'Filter', icon: Filter, operationType: 'filter', description: "Filter rows according to one or more conditions." },
        { name: 'Join', icon: GitCompare, operationType: 'join', description: "Combine data from two different sources." },
        { name: 'Aggregate', icon: Group, operationType: 'group_by', description: "Group data and apply aggregation functions (SUM, AVG...)." },
        { name: 'Sort', icon: SortAsc, operationType: 'sort', description: "Sort data according to one or more columns." },
        { name: 'Select Columns', icon: Table, operationType: 'select_columns', description: "Choose columns to keep or exclude." },
        { name: 'Union', icon: Combine, operationType: 'union', description: "Combine rows from two data sources." },
        { name: 'Pass-through (No-op)', icon: ArrowRightLeft, operationType: 'no_op', description: "A pass-through transformation that doesn't modify the data." },
    ],
};

export const advancedTransformations: TransformationCategory[] = [
    {
        category: 'Cleaning and Quality',
        items: [
            { name: 'Deduplication', icon: Trash2, operationType: 'deduplication', description: 'Remove duplicate rows.' },
            { name: 'Handle Missing Values', icon: Replace, operationType: 'handle_missing_values', description: 'Replace or remove null values.' },
            { name: 'Normalize Formats', icon: Settings, operationType: 'normalize_formats', description: 'Standardize data formats (dates, numbers...).' },
            { name: 'Fix Typos', icon: SpellCheck, operationType: 'fix_typos', description: 'Correct common typing errors.' },
            { name: 'Quality Control', icon: CheckSquare, operationType: 'quality_control', description: 'Validate data against defined rules.' },
            { name: 'Standardize Strings', icon: CaseSensitive, operationType: 'standardize_strings', description: 'Convert to uppercase, lowercase, etc.' },
        ]
    },
    {
        category: 'Structural Transformations',
        items: [
            { name: 'Pivot/Unpivot', icon: UnfoldVertical, operationType: 'pivot_unpivot', description: 'Pivot rows to columns and vice versa.' },
            { name: 'Split/Merge Columns', icon: Columns, operationType: 'split_merge_columns', description: 'Divide or merge columns.' },
            { name: 'Transpose', icon: ArrowRightLeft, operationType: 'transpose', description: 'Swap rows and columns.' },
            { name: 'Denormalize/Normalize', icon: GitCommit, operationType: 'denormalize', description: 'Modify the database structure.' },
            { name: 'Nested to Flat', icon: FileJson, operationType: 'nested_to_flat', description: 'Flatten JSON or nested structures.' },
            { name: 'Array Operations', icon: Rows, operationType: 'array_operations', description: 'Operations on arrays (explode, etc.).' },
        ]
    }
];
