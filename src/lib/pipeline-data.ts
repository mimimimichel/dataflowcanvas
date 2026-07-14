import type { Icon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
export type { NodeType };

export type DataClassification = 'public' | 'internal' | 'confidential' | 'pii';

export interface Field {
  name: string;
  type: string;
  nullable?: boolean;
  classification?: DataClassification;
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

export interface SqlPatternOperation extends BaseOperation {
    type: 'sql_pattern';
    settings: {
        patternId: string;
        params: Record<string, string>;
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
    | SqlPatternOperation
    | BaseOperation;

export interface PipelineNode {
  id: string;
  name: string;
  description?: string;
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

/** A Data Product groups one or more pipelines (Lineages) under a shared, canvas-independent documentation space. */
export interface DataProduct {
  id: string;
  name: string;
  description: string;
  owner: string;
  lastEdited: string;
  lineageIds: string[];
  documentation: DataProductDocumentation;
}

/** A Project is a client engagement or initiative; it groups Data Products. */
export interface Project {
  id: string;
  name: string;
  description: string;
  owner: string;
  lastEdited: string;
  dataProducts: DataProduct[];
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
    case 'sql_pattern':
      return { type: 'sql_pattern', settings: { patternId: '', params: {} } };
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
    type: 'source' as NodeType, 
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
    type: 'source' as NodeType, 
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
    type: 'transformation' as NodeType, 
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
    type: 'transformation' as NodeType, 
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

export const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Retail Analytics Platform',
    description: 'Data products powering merchandising and customer analytics.',
    owner: 'Me',
    lastEdited: '2 hours ago',
    dataProducts: [
      {
        id: 'dp-1',
        name: 'Customer 360',
        description: 'Unified customer revenue and activity view for the planning apps.',
        owner: 'Jane Doe',
        lastEdited: '2 hours ago',
        lineageIds: ['lineage-1'],
        documentation: createEmptyDataProductDocumentation(),
      },
      {
        id: 'dp-2',
        name: 'Inventory Intelligence',
        description: 'Warehouse stock levels synced with the external marketplace.',
        owner: 'John Smith',
        lastEdited: '3 days ago',
        lineageIds: ['lineage-2'],
        documentation: createEmptyDataProductDocumentation(),
      },
    ],
  },
  {
    id: 'project-2',
    name: 'Marketing Growth',
    description: 'Lead scoring and campaign attribution data products.',
    owner: 'Sarah Connor',
    lastEdited: 'Yesterday',
    dataProducts: [
      {
        id: 'dp-3',
        name: 'Lead Scoring',
        description: 'Normalized inbound leads from CRM, prepared for campaign scoring.',
        owner: 'Sarah Connor',
        lastEdited: 'Yesterday',
        lineageIds: ['lineage-3'],
        documentation: createEmptyDataProductDocumentation(),
      },
    ],
  },
];

export interface TransformationItem {
    name: string;
    icon: LucideIcon;
    type: NodeType;
    operationType?: OperationType;
    description?: string;
    defaultSettings?: Record<string, any>;
}

export interface TransformationCategory {
  category: string;
  items: TransformationItem[];
}

export const transformations = {
    sources: [
        { name: 'Database Source', icon: Database, type: 'source' as NodeType, description: "Connect to a SQL database." },
        { name: 'File Source', icon: FileText, type: 'source' as NodeType, description: "Use a file (CSV, JSON, etc.) as a source." }
    ],
    dataset: { name: 'Intermediate Dataset', icon: Layers, type: 'transformation' as NodeType, description: "Store intermediate results of a pipeline." },
    destination: { name: 'Data Warehouse', icon: DatabaseZap, type: 'destination' as NodeType, description: "Load data into a data warehouse." },
    common: [
        { name: 'Filter', icon: Filter, operationType: 'filter' as const, type: 'transformation' as NodeType, description: "Filter rows according to one or more conditions." },
        { name: 'Join', icon: GitCompare, operationType: 'join' as const, type: 'transformation' as NodeType, description: "Combine data from two different sources." },
        { name: 'Aggregate', icon: Group, operationType: 'group_by' as const, type: 'transformation' as NodeType, description: "Group data and apply aggregation functions (SUM, AVG...)." },
        { name: 'Sort', icon: SortAsc, operationType: 'sort' as const, type: 'transformation' as NodeType, description: "Sort data according to one or more columns." },
        { name: 'Select Columns', icon: Table, type: 'transformation' as NodeType, operationType: 'select_columns' as const, description: "Choose columns to keep or exclude." },
        { name: 'Union', icon: Combine, type: 'transformation' as NodeType, operationType: 'union' as const, description: "Combine rows from two data sources." },
        { name: 'Pass-through (No-op)', icon: ArrowRightLeft,  type: 'transformation' as NodeType, operationType: 'no_op' as const, description: "A pass-through transformation that doesn't modify the data." },
    ],
};

// --- Mission Spec (Foundry pipeline spec template, filled during client engagements) ---

export type PipelineCriticality = 'Vitale' | 'Haute' | 'Moyenne' | 'Basse';
export type PipelineSensitivity = 'Aucune' | 'Interne' | 'Confidentiel' | 'Données personnelles (RGPD)';
export type QualityControlType = 'Complétude' | 'Unicité' | 'Cohérence référentielle' | 'Fraîcheur' | 'Plage de validité' | 'Volumétrie' | 'Autre';

export interface MissionSpecLinks {
  repo?: string;
  lineage?: string;
  schedule?: string;
  healthChecks?: string;
}

export interface PipelineIdentityCard {
  purpose?: string;
  owner?: string;
  backupContact?: string;
  criticality?: PipelineCriticality;
  downstreamConsumers?: string;
  freshnessSla?: string;
  availabilityWindow?: string;
  foundryEnvironment?: string;
  links?: MissionSpecLinks;
  sensitivity?: PipelineSensitivity;
  lastValidatedAt?: string;
}

export interface AdrEntry {
  id: string;
  date: string;
  decision: string;
  context: string;
  alternatives: string;
  deciders: string;
  impact: string;
}

export interface RunbookEntry {
  id: string;
  scenario: string;
  symptom: string;
  diagnosis: string;
  procedure: string;
  backfill: string;
  recoveryDuration: string;
  escalation: string;
}

export interface DocVersionEntry {
  version: string;
  date: string;
  author: string;
  changes: string;
  validatedBy: string;
}

export interface DocLink {
  label: string;
  url: string;
}

/** A Data Product's documentation space: exists independently of any pipeline design. */
export interface DataProductDocumentation {
  overview: string;
  identityCard: PipelineIdentityCard;
  links: DocLink[];
  adrs: AdrEntry[];
  runbook: RunbookEntry[];
  versions: DocVersionEntry[];
}

export function createEmptyDataProductDocumentation(): DataProductDocumentation {
  return { overview: '', identityCard: {}, links: [], adrs: [], runbook: [], versions: [] };
}

// --- Compliance Audit ---

export type ComplianceDimensionKey = 'completeness' | 'coherence' | 'quality' | 'maintainability' | 'security';

export const COMPLIANCE_DIMENSION_WEIGHTS: Record<ComplianceDimensionKey, number> = {
  completeness: 0.5,
  coherence: 0.125,
  quality: 0.125,
  maintainability: 0.125,
  security: 0.125,
};

export const COMPLIANCE_DIMENSION_LABELS: Record<ComplianceDimensionKey, string> = {
  completeness: 'Completeness',
  coherence: 'Coherence',
  quality: 'Data Quality',
  maintainability: 'Maintainability',
  security: 'Security & PII',
};

export type ComplianceGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export type ComplianceSeverity = 'info' | 'warning' | 'critical';

export interface ComplianceIssue {
  dimension: ComplianceDimensionKey;
  severity: ComplianceSeverity;
  message: string;
  nodeId?: string;
}

export interface ComplianceDimensionResult {
  key: ComplianceDimensionKey;
  label: string;
  weight: number;
  score: number;
}

export interface ComplianceAuditResult {
  score: number;
  grade: ComplianceGrade;
  dimensions: ComplianceDimensionResult[];
  issues: ComplianceIssue[];
}

export function scoreToGrade(score: number): ComplianceGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'E';
}

export const advancedTransformations: TransformationCategory[] = [
    {
        category: 'Cleaning and Quality',
        items: [
            { name: 'Deduplication', icon: Trash2, operationType: 'deduplication' as const, type: 'transformation' as NodeType, description: 'Remove duplicate rows.' },
            { name: 'Handle Missing Values', icon: Replace, operationType: 'handle_missing_values' as const, type: 'transformation' as NodeType, description: 'Replace or remove null values.' },
            { name: 'Normalize Formats', icon: Settings, operationType: 'normalize_formats' as const, type: 'transformation' as NodeType, description: 'Standardize data formats (dates, numbers...).' },
            { name: 'Fix Typos', icon: SpellCheck, operationType: 'fix_typos' as const, type: 'transformation' as NodeType, description: 'Correct common typing errors.' },
            { name: 'Quality Control', icon: CheckSquare, operationType: 'quality_control' as const, type: 'transformation' as NodeType, description: 'Validate data against defined rules.' },
            { name: 'Standardize Strings', icon: CaseSensitive, operationType: 'standardize_strings' as const, type: 'transformation' as NodeType, description: 'Convert to uppercase, lowercase, etc.' },
        ]
    },
    {
        category: 'Structural Transformations',
        items: [
            { name: 'Pivot/Unpivot', icon: UnfoldVertical, type: 'transformation' as NodeType, operationType: 'pivot_unpivot' as const, description: 'Pivot rows to columns and vice versa.' },
            { name: 'Split/Merge Columns', icon: Columns, type: 'transformation' as NodeType, operationType: 'split_merge_columns' as const, description: 'Divide or merge columns.' },
            { name: 'Transpose', icon: ArrowRightLeft, type: 'transformation' as NodeType, operationType: 'transpose' as const, description: 'Swap rows and columns.' },
            { name: 'Denormalize/Normalize', icon: GitCommit, type: 'transformation' as NodeType, operationType: 'denormalize' as const, description: 'Modify the database structure.' },
            { name: 'Nested to Flat', icon: FileJson, type: 'transformation' as NodeType, operationType: 'nested_to_flat' as const, description: 'Flatten JSON or nested structures.' },
            { name: 'Array Operations', icon: Rows, type: 'transformation' as NodeType, operationType: 'array_operations' as const, description: 'Operations on arrays (explode, etc.).' },
        ]
    }
];
