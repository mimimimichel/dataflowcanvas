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

export type OperationType = 'filter' | 'join' | 'group_by' | 'sort' | 'select_columns' | 'union' | 'no_op' | string;

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

export type Operation = 
    | FilterOperation 
    | JoinOperation 
    | GroupByOperation 
    | SortOperation 
    | SelectColumnsOperation 
    | UnionOperation 
    | BaseOperation;

export interface PipelineNode {
  id: string;
  name: string;
  type: NodeType;
  position: { x: number; y: number };
  system?: string;
  location?: string;
  inputFields?: Field[];
  outputFields?: Field[];
  operation?: Operation;
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
}

export interface LineageInfo {
  id: string;
  name: string;
  owner: string;
  lastEdited: string;
  description: string;
  versions: PipelineVersion[];
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
    position: { x: 50, y: 150 },
    system: 'PostgreSQL',
    location: 'prod-customers-db',
    outputFields: [
      { name: 'id', type: 'integer' },
      { name: 'first_name', type: 'string' },
      { name: 'last_name', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'is_active', type: 'boolean' },
    ]
  },
    { 
    id: 'source-2', 
    name: 'Orders DB', 
    type: 'source', 
    position: { x: 50, y: 350 },
    system: 'PostgreSQL',
    location: 'prod-orders-db',
    outputFields: [
      { name: 'order_id', type: 'integer' },
      { name: 'customer_id', type: 'integer' },
      { name: 'amount', type: 'float' },
      { name: 'order_date', type: 'date' },
    ]
  },
  { 
    id: 'transform-1', 
    name: 'Filter Inactive', 
    type: 'transformation', 
    position: { x: 350, y: 50 },
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
    ]
  },
  { 
    id: 'transform-2', 
    name: 'Join Orders', 
    type: 'transformation', 
    position: { x: 350, y: 250 },
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
    ]
  },
  { 
    id: 'transform-3', 
    name: 'Aggregate Spend', 
    type: 'transformation', 
    position: { x: 650, y: 150 },
    operation: { 
        type: 'group_by', 
        settings: {
            groupByFields: ['id', 'first_name', 'last_name'],
            aggregations: [
                { field: 'amount', type: 'sum', newName: 'total_spend' }
            ]
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
        { name: 'total_spend', type: 'float' },
    ]
  },
  { 
    id: 'dest-1', 
    name: 'Data Warehouse', 
    type: 'destination', 
    position: { x: 950, y: 150 },
    system: 'Snowflake',
    location: 'analytics_db.mkt.customer_ltv',
    inputFields: [
        { name: 'id', type: 'integer' },
        { name: 'first_name', type: 'string' },
        { name: 'last_name', type: 'string' },
        { name: 'total_spend', type: 'float' },
    ]
  },
];

export const initialConnectors: Connector[] = [
  { from: 'source-1', to: 'transform-1' },
  { from: 'source-1', to: 'transform-2' },
  { from: 'source-2', to: 'transform-2' },
  { from: 'transform-2', to: 'transform-3' },
  { from: 'transform-3', to: 'dest-1' },
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
       { id: 'v1', name: 'v1.0', nodes: [], connectors: [] }
    ]
  },
  {
    id: 'lineage-3',
    name: 'Marketing Leads ETL',
    owner: 'Sarah Connor',
    lastEdited: 'Yesterday',
    description: 'Normalizes inbound leads from CRM and prepares for campaign scoring.',
    versions: [
       { id: 'v1', name: 'v1.0', nodes: [], connectors: [] }
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
    },
    {
        category: 'Aggregations and Calculations',
        items: [
            { name: 'Numeric Aggregations', icon: Sigma, operationType: 'numeric_aggregation', description: 'Advanced statistical calculations.' },
            { name: 'Window Functions', icon: Rows, operationType: 'window_functions', description: 'Calculations on data windows (e.g., moving average).' },
            { name: 'Binning', icon: BoxSelect, operationType: 'binning', description: 'Group values into intervals.' },
            { name: 'Percentiles and Quantiles', icon: BarChart3, operationType: 'percentiles', description: 'Calculate percentiles.' },
            { name: 'Temporal Aggregation', icon: Clock, operationType: 'temporal_aggregation', description: 'Aggregate data by time periods.' },
            { name: 'Self Joins', icon: GitPullRequest, operationType: 'self_join', description: 'Join a table with itself.' },
        ]
    },
    {
        category: 'Enrichment and Advanced Filters',
        items: [
            { name: 'Fuzzy Matching', icon: Bot, operationType: 'fuzzy_matching', description: 'Match similar character strings.' },
            { name: 'Intersect/Except', icon: Unplug, operationType: 'intersect_except', description: 'Set operations on data.' },
            { name: 'Lookup Enrichment', icon: Search, operationType: 'lookup_enrichment', description: 'Enrich data from a reference table.' },
            { name: 'Temporal Filters', icon: CalendarDays, operationType: 'temporal_filter', description: 'Filter by dates or periods.' },
            { name: 'Regex Filter', icon: Pilcrow, operationType: 'regex_filter', description: 'Filter using regular expressions.' },
            { name: 'Top N/Bottom N', icon: SortAsc, operationType: 'top_n', description: 'Select the first or last N rows.' },
            { name: 'Sampling', icon: Shuffle, operationType: 'sampling', description: 'Take a sample of data.' },
            { name: 'Distinct/Unique', icon: GitCommit, operationType: 'distinct', description: 'Get unique values.' },
        ]
    },
    {
        category: 'Custom Functions and Calculations',
        items: [
            { name: 'Arithmetic Operations', icon: FunctionSquare, operationType: 'arithmetic', description: 'Addition, subtraction, etc.' },
            { name: 'Math Functions', icon: Sigma, operationType: 'math_functions', description: 'Mathematical functions (log, exp...).' },
            { name: 'Conditional Calculations', icon: Milestone, operationType: 'conditional_calculation', description: 'Calculations based on conditions (IF/ELSE).' },
            { name: 'Derived Columns', icon: Plus, operationType: 'derived_columns', description: 'Create new columns from others.' },
            { name: 'Unit Conversions', icon: Replace, operationType: 'unit_conversion', description: 'Convert measurement units.' },
            { name: 'Custom Formulas', icon: Pencil, operationType: 'custom_formula', description: 'Apply a custom formula.' },
        ]
    },
    {
        category: 'Temporal Data',
        items: [
            { name: 'Date Part Extraction', icon: Timer, operationType: 'date_part_extraction', description: 'Extract year, month, day, etc.' },
            { name: 'Duration Calculation', icon: Clock, operationType: 'duration_calculation', description: 'Calculate durations between two dates.' },
            { name: 'Date Formatting', icon: CalendarDays, operationType: 'date_formatting', description: 'Change date display format.' },
            { name: 'Time Shifting', icon: ArrowRightLeft, operationType: 'time_shifting', description: 'Shift data in time.' },
            { name: 'Rolling Aggregations', icon: Rows, operationType: 'rolling_aggregations', description: 'Aggregate data over a sliding window.' },
            { name: 'Timezone Handling', icon: Globe, operationType: 'timezone_handling', description: 'Convert between timezones.' },
        ]
    },
    {
        category: 'Text Processing and NLP',
        items: [
            { name: 'String Manipulation', icon: FileText, operationType: 'string_manipulation', description: 'Concatenation, substring, etc.' },
            { name: 'Search and Extract', icon: Search, operationType: 'text_search_extract', description: 'Extract text with patterns.' },
            { name: 'Sentiment Analysis', icon: Bot, operationType: 'sentiment_analysis', description: 'Determine the sentiment of a text.' },
            { name: 'Tokenization', icon: WholeWord, operationType: 'tokenization', description: 'Divide text into words or sentences.' },
            { name: 'Linguistic Normalization', icon: SpellCheck, operationType: 'linguistic_normalization', description: 'Lemmatization, etc.' },
            { name: 'Language Detection', icon: Globe, operationType: 'language_detection', description: 'Identify the language of a text.' },
        ]
    },
    {
        category: 'Machine Learning and Data Preparation',
        items: [
            { name: 'One-hot Encoding', icon: Hash, operationType: 'one_hot_encoding', description: 'Convert categorical variables to binary format.' },
            { name: 'Label Encoding', icon: Pilcrow, operationType: 'label_encoding', description: 'Assign a numeric value to each category.' },
            { name: 'Numeric Binning', icon: BoxSelect, operationType: 'numeric_binning', description: 'Convert numeric variables to categories.' },
            { name: 'Feature Scaling', icon: Sigma, operationType: 'feature_scaling', description: 'Scale features (min-max, standard...).' },
            { name: 'Hashing', icon: Fingerprint, operationType: 'hashing', description: 'Hash features.' },
            { name: 'Custom Mapping', icon: GitCompare, operationType: 'custom_mapping', description: 'Apply custom mappings.' },
        ]
    },
    {
        category: 'External Integration and Enrichment',
        items: [
            { name: 'Geocoding', icon: Globe, operationType: 'geocoding', description: 'Convert addresses to GPS coordinates.' },
            { name: 'API Calls', icon: Unplug, operationType: 'api_calls', description: 'Call external APIs to enrich data.' },
            { name: 'Lookup Tables', icon: Search, operationType: 'lookup_tables', description: 'Search for values in external tables.' },
            { name: 'Master Data Matching', icon: GitCompare, operationType: 'master_data_matching', description: 'Match with reference data.' },
            { name: 'Scoring and Classification', icon: Bot, operationType: 'scoring_classification', description: 'Apply a scoring model.' },
            { name: 'External Validation', icon: CheckSquare, operationType: 'external_validation', description: 'Validate data via an external service.' },
        ]
    },
    {
        category: 'Security and Compliance',
        items: [
            { name: 'Anonymization', icon: Fingerprint, operationType: 'anonymization', description: 'Remove personal information.' },
            { name: 'Pseudonymization', icon: Replace, operationType: 'pseudonymization', description: 'Replace identifiers with pseudonyms.' },
            { name: 'Data Masking', icon: EyeOff, operationType: 'data_masking', description: 'Mask parts of sensitive data.' },
            { name: 'Encryption/Decryption', icon: KeyRound, operationType: 'encryption', description: 'Encrypt or decrypt data.' },
            { name: 'Tokenization', icon: Lock, operationType: 'security_tokenization', description: 'Replace sensitive data with tokens.' },
            { name: 'Audit Trail', icon: ClipboardList, operationType: 'audit_trail', description: 'Generate an audit trail.' },
        ]
    },
    {
        category: 'Flow and Control Logic',
        items: [
            { name: 'Conditional Routing', icon: GitBranch, operationType: 'conditional_routing', description: 'Route data according to conditions.' },
            { name: 'Multi-branch Transformations', icon: Milestone, operationType: 'multi_branch', description: 'Apply different transformations in parallel.' },
            { name: 'Validation with Exceptions', icon: CheckSquare, operationType: 'validation_with_exceptions', description: 'Handle validation exceptions.' },
            { name: 'Switch/Case Statements', icon: CaseSensitive, operationType: 'switch_case', description: 'Switch/case style logic.' },
            { name: 'Cascading Transforms', icon: Rows, operationType: 'cascading_transforms', description: 'Chain multiple simple transformations.' },
        ]
    },
    {
        category: 'Formatting and Type Conversion',
        items: [
            { name: 'Type Conversion', icon: Replace, operationType: 'type_conversion', description: 'Convert data type (string, int...).' },
            { name: 'Format Parsing', icon: FileJson, operationType: 'format_parsing', description: 'Analyze complex formats (JSON, XML...).' },
            { name: 'Serialization', icon: Code, operationType: 'serialization', description: 'Convert data to serial format.' },
            { name: 'Compression/Decompression', icon: DatabaseBackup, operationType: 'compression', description: 'Compress or decompress data.' },
            { name: 'Encoding Conversion', icon: Pilcrow, operationType: 'encoding_conversion', description: 'Change character encoding.' },
        ]
    },
    {
        category: 'Statistical Analysis',
        items: [
            { name: 'Z-score, Outlier Detection', icon: TestTube, operationType: 'outlier_detection', description: 'Detect outliers.' },
            { name: 'Distributions and Histograms', icon: BarChart3, operationType: 'histogram', description: 'Generate histograms.' },
            { name: 'Correlations and Covariances', icon: Blend, operationType: 'correlation', description: 'Calculate correlations.' },
            { name: 'Automated Statistical Tests', icon: Bot, operationType: 'statistical_tests', description: 'Perform statistical tests.' },
            { name: 'Sampling Strategies', icon: Shuffle, operationType: 'sampling_strategies', description: 'Advanced sampling strategies.' },
            { name: 'Data Profiling', icon: Database, operationType: 'data_profiling', description: 'Analyze data profile.' },
        ]
    }
];
