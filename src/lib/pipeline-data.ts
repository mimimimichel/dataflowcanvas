
import type { Icon } from 'lucide-react';
import { 
  Database, Filter, Combine, BarChart3, DatabaseZap, Trash2, GitCommit, 
  ArrowRightLeft, Columns, Replace, CheckSquare, Rows, SortAsc, UnfoldVertical,
  ClipboardList, Plus, Minus, Divide, Sigma, CaseSensitive, CalendarDays,
  Timer, Clock, WholeWord, SpellCheck, Globe, Hash, KeyRound, Lock, GitBranch,
  Milestone, DatabaseBackup, TestTube, FileJson, GitPullRequest, Settings,
  FileText, FunctionSquare, Pilcrow, Pencil, Search, GitCompare, EyeOff,
  Fingerprint, Bot, Group, Shuffle, Blend, BoxSelect, Code, Unplug, Layers,
  Table
} from 'lucide-react';
import type { NodeType } from '@/components/data-flow/node';

export interface Field {
  name: string;
  type: string;
}

export type OperationType = 'filter' | 'join' | 'group_by' | string;

export interface BaseOperation {
    type: OperationType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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


export type Operation = FilterOperation | JoinOperation | GroupByOperation | BaseOperation;

export interface PipelineNode {
  id: string;
  name: string;
  type: NodeType;
  position: { x: number; y: number };
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

export const initialVersions: PipelineVersion[] = [
  {
    id: 'v1',
    name: 'v1.0 (Production)',
    nodes: initialNodes,
    connectors: initialConnectors,
  },
    {
    id: 'v2',
    name: 'v1.1 (Development)',
    nodes: JSON.parse(JSON.stringify(initialNodes)).map((n: PipelineNode) => ({...n, id: `${n.id}-v2`})),
    connectors: JSON.parse(JSON.stringify(initialConnectors)).map((c: Connector) => ({from: `${c.from}-v2`, to: `${c.to}-v2`})),
  },
];


export interface TransformationItem {
    name: string;
    icon: Icon;
    type: NodeType;
    operationType?: OperationType;
    description?: string;
}

export const transformations = {
    sources: [
        { name: 'Database Source', icon: Database, description: "Connect to a SQL database." },
        { name: 'File Source', icon: FileText, description: "Use a file (CSV, JSON, etc.) as a source." }
    ],
    dataset: { name: 'Intermediate Dataset', icon: Layers, description: "Store intermediate results of a pipeline." },
    destination: { name: 'Data Warehouse', icon: DatabaseZap, description: "Load data into a data warehouse." },
    common: [
        { name: 'Filtrer', icon: Filter, operationType: 'filter', description: "Filtrer des lignes selon une ou plusieurs conditions." },
        { name: 'Joindre', icon: GitCompare, operationType: 'join', description: "Combiner des données de deux sources différentes." },
        { name: 'Agréger', icon: Group, operationType: 'group_by', description: "Regrouper des données et appliquer des fonctions d'agrégation (SUM, AVG...)." },
        { name: 'Trier', icon: SortAsc, operationType: 'sort', description: "Trier les données selon une ou plusieurs colonnes." },
        { name: 'Sélectionner des colonnes', icon: Table, operationType: 'select_columns', description: "Choisir les colonnes à conserver ou à exclure." },
        { name: 'Union', icon: Combine, operationType: 'union', description: "Combiner les lignes de deux sources de données." },
        { name: 'Passe-plat (No-op)', icon: ArrowRightLeft, operationType: 'no_op', description: "A pass-through transformation that doesn't modify the data." },
    ],
    advanced: [
        {
            name: "TRANSFORMATIONS DE NETTOYAGE (Data Cleaning)",
            items: [
                { name: 'Déduplication', icon: Trash2, operationType: 'deduplication' },
                { name: 'Gestion des valeurs manquantes', icon: Replace, operationType: 'handle_missing_values' },
                { name: 'Normalisation des formats', icon: Settings, operationType: 'normalize_formats' },
                { name: 'Correction des erreurs typographiques', icon: SpellCheck, operationType: 'fix_typos' },
                { name: 'Validation et contrôle qualité', icon: CheckSquare, operationType: 'quality_control' },
                { name: 'Standardisation des chaînes', icon: CaseSensitive, operationType: 'standardize_strings' },
            ]
        },
        {
            name: "TRANSFORMATIONS STRUCTURELLES",
            items: [
                { name: 'Pivot/Unpivot', icon: UnfoldVertical, operationType: 'pivot_unpivot' },
                { name: 'Split/Merge colonnes', icon: Columns, operationType: 'split_merge_columns' },
                { name: 'Transposition', icon: ArrowRightLeft, operationType: 'transpose' },
                { name: 'Dénormalisation/Normalisation', icon: GitCommit, operationType: 'denormalize' },
                { name: 'Nested to flat', icon: FileJson, operationType: 'nested_to_flat' },
                { name: 'Array operations', icon: Rows, operationType: 'array_operations' },
            ]
        },
        {
            name: "TRANSFORMATIONS D'AGRÉGATION",
            items: [
                { name: 'Agrégations numériques', icon: Sigma, operationType: 'numeric_aggregation' },
                { name: 'Window functions', icon: Rows, operationType: 'window_functions' },
                { name: 'Binning', icon: BoxSelect, operationType: 'binning' },
                { name: 'Percentiles et quantiles', icon: BarChart3, operationType: 'percentiles' },
                { name: 'Agrégations temporelles', icon: Clock, operationType: 'temporal_aggregation' },
            ]
        },
        {
            name: "JOINTURES ET UNIONS",
            items: [
                { name: 'Self joins', icon: GitPullRequest, operationType: 'self_join' },
                { name: 'Fuzzy matching', icon: Bot, operationType: 'fuzzy_matching' },
                { name: 'Intersect/Except', icon: Unplug, operationType: 'intersect_except' },
                { name: 'Lookup enrichment', icon: Search, operationType: 'lookup_enrichment' },
            ]
        },
        {
            name: "FILTRAGE ET SÉLECTION",
            items: [
                { name: 'Filtres temporels', icon: CalendarDays, operationType: 'temporal_filter' },
                { name: 'Filtres par expression régulière', icon: Pilcrow, operationType: 'regex_filter' },
                { name: 'Top N/Bottom N', icon: SortAsc, operationType: 'top_n' },
                { name: 'Échantillonnage', icon: Shuffle, operationType: 'sampling' },
                { name: 'Distinct/Unique', icon: GitCommit, operationType: 'distinct' },
            ]
        },
        {
            name: "TRANSFORMATIONS DE CALCUL",
            items: [
                { name: 'Opérations arithmétiques', icon: FunctionSquare, operationType: 'arithmetic' },
                { name: 'Fonctions mathématiques', icon: Sigma, operationType: 'math_functions' },
                { name: 'Calculs conditionnels', icon: Milestone, operationType: 'conditional_calculation' },
                { name: 'Calculs de colonnes dérivées', icon: Plus, operationType: 'derived_columns' },
                { name: 'Conversions d\'unités', icon: Replace, operationType: 'unit_conversion' },
                { name: 'Formules personnalisées', icon: Pencil, operationType: 'custom_formula' },
            ]
        },
        {
            name: "TRANSFORMATIONS TEMPORELLES",
            items: [
                { name: 'Extraction de composants', icon: Timer, operationType: 'date_part_extraction' },
                { name: 'Calculs de durée', icon: Clock, operationType: 'duration_calculation' },
                { name: 'Formatage de dates', icon: CalendarDays, operationType: 'date_formatting' },
                { name: 'Décalages temporels', icon: ArrowRightLeft, operationType: 'time_shifting' },
                { name: 'Agrégations roulantes', icon: Rows, operationType: 'rolling_aggregations' },
                { name: 'Gestion des fuseaux horaires', icon: Globe, operationType: 'timezone_handling' },
            ]
        },
        {
            name: "TRANSFORMATIONS DE TEXTE",
            items: [
                { name: 'Manipulation de chaînes', icon: FileText, operationType: 'string_manipulation' },
                { name: 'Recherche et extraction', icon: Search, operationType: 'text_search_extract' },
                { name: 'Analyse de sentiment', icon: Bot, operationType: 'sentiment_analysis' },
                { name: 'Tokenisation', icon: WholeWord, operationType: 'tokenization' },
                { name: 'Normalisation linguistique', icon: SpellCheck, operationType: 'linguistic_normalization' },
                { name: 'Détection de langue', icon: Globe, operationType: 'language_detection' },
            ]
        },
        {
            name: "ENCODAGE ET CATÉGORISATION",
            items: [
                { name: 'One-hot encoding', icon: Hash, operationType: 'one_hot_encoding' },
                { name: 'Label encoding', icon: Pilcrow, operationType: 'label_encoding' },
                { name: 'Binning numérique', icon: BoxSelect, operationType: 'numeric_binning' },
                { name: 'Feature scaling', icon: Sigma, operationType: 'feature_scaling' },
                { name: 'Hachage', icon: Fingerprint, operationType: 'hashing' },
                { name: 'Mapping personnalisé', icon: GitCompare, operationType: 'custom_mapping' },
            ]
        },
        {
            name: "ENRICHISSEMENT EXTERNE",
            items: [
                { name: 'Géocoding', icon: Globe, operationType: 'geocoding' },
                { name: 'API calls', icon: Unplug, operationType: 'api_calls' },
                { name: 'Lookup tables', icon: Search, operationType: 'lookup_tables' },
                { name: 'Master data matching', icon: GitCompare, operationType: 'master_data_matching' },
                { name: 'Scoring et classification', icon: Bot, operationType: 'scoring_classification' },
                { name: 'Validation externe', icon: CheckSquare, operationType: 'external_validation' },
            ]
        },
        {
            name: "TRANSFORMATIONS DE SÉCURITÉ",
            items: [
                { name: 'Anonymisation', icon: Fingerprint, operationType: 'anonymization' },
                { name: 'Pseudonymisation', icon: Replace, operationType: 'pseudonymization' },
                { name: 'Masquage de données', icon: EyeOff, operationType: 'data_masking' },
                { name: 'Chiffrement/Déchiffrement', icon: KeyRound, operationType: 'encryption' },
                { name: 'Tokenisation', icon: Lock, operationType: 'security_tokenization' },
                { name: 'Audit trail', icon: ClipboardList, operationType: 'audit_trail' },
            ]
        },
        {
            name: "TRANSFORMATIONS CONDITIONNELLES",
            items: [
                { name: 'Routage conditionnel', icon: GitBranch, operationType: 'conditional_routing' },
                { name: 'Transformations multi-branches', icon: Milestone, operationType: 'multi_branch' },
                { name: 'Validation avec exceptions', icon: CheckSquare, operationType: 'validation_with_exceptions' },
                { name: 'Switch/Case statements', icon: CaseSensitive, operationType: 'switch_case' },
                { name: 'Transformations en cascade', icon: Rows, operationType: 'cascading_transforms' },
            ]
        },
        {
            name: "TRANSFORMATIONS DE FORMAT",
            items: [
                { name: 'Conversion de types', icon: Replace, operationType: 'type_conversion' },
                { name: 'Parsing de formats', icon: FileJson, operationType: 'format_parsing' },
                { name: 'Sérialisation', icon: Code, operationType: 'serialization' },
                { name: 'Compression/Décompression', icon: DatabaseBackup, operationType: 'compression' },
                { name: 'Conversion d\'encodage', icon: Pilcrow, operationType: 'encoding_conversion' },
            ]
        },
        {
            name: "TRANSFORMATIONS STATISTIQUES",
            items: [
                { name: 'Z-score, outlier detection', icon: TestTube, operationType: 'outlier_detection' },
                { name: 'Distributions et histogrammes', icon: BarChart3, operationType: 'histogram' },
                { name: 'Corrélations et covariances', icon: Blend, operationType: 'correlation' },
                { name: 'Tests statistiques automatisés', icon: Bot, operationType: 'statistical_tests' },
                { name: 'Sampling strategies', icon: Shuffle, operationType: 'sampling_strategies' },
                { name: 'Data profiling', icon: Database, operationType: 'data_profiling' },
            ]
        }
    ]
};
