
import type { Icon } from 'lucide-react';
import { 
  Database, Filter, Combine, BarChart3, DatabaseZap, Trash2, GitCommit, 
  ArrowRightLeft, Columns, Replace, CheckSquare, Rows, SortAsc, UnfoldVertical,
  ClipboardList, Plus, Minus, Divide, Sigma, CaseSensitive, CalendarDays,
  Timer, Clock, WholeWord, SpellCheck, Globe, Hash, KeyRound, Lock, GitBranch,
  Milestone, DatabaseBackup, TestTube, FileJson, GitPullRequest, Settings,
  FileText, FunctionSquare, Pilcrow, Pencil, Search, GitCompare, EyeOff,
  Fingerprint, Bot, Group, Shuffle, Blend, BoxSelect, Code, Unplug, Layers
} from 'lucide-react';
import type { NodeType } from '@/components/data-flow/node';

export interface Field {
  name: string;
  type: string;
}

export type OperationType = 'filter' | 'join';

export interface BaseOperation {
    type: OperationType;
}

export interface FilterOperation extends BaseOperation {
    type: 'filter';
    settings: {
        field: string;
        operator: string;
        value: string | number | boolean;
    }
}

export interface JoinOperation extends BaseOperation {
    type: 'join';
    settings: {
        leftNodeId: string;
        rightNodeId: string;
        joinType: 'inner' | 'left' | 'right' | 'full';
        condition: {
            leftField: string;
            rightField: string;
        }
    }
}


export type Operation = FilterOperation | JoinOperation;

export interface PipelineNode {
  id: string;
  name: string;
  type: NodeType;
  position: { x: number; y: number };
  inputFields?: Field[];
  outputFields?: Field[];
  operation?: Operation;
}

export const nodes: PipelineNode[] = [
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
            rightNodeId: 'source-2', // Placeholder, assuming another source exists
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
    ],
    outputFields: [
      { name: 'id', type: 'integer' },
      { name: 'first_name', type: 'string' },
      { name: 'last_name', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'is_active', type: 'boolean' },
      { name: 'order_id', type: 'integer' },
      { name: 'amount', type: 'float' },
    ]
  },
  { 
    id: 'transform-3', 
    name: 'Aggregate Spend', 
    type: 'transformation', 
    position: { x: 650, y: 150 },
    inputFields: [
       { name: 'id', type: 'integer' },
      { name: 'first_name', type: 'string' },
      { name: 'last_name', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'is_active', type: 'boolean' },
      { name: 'order_id', type: 'integer' },
      { name: 'amount', type: 'float' },
    ],
    outputFields: [
        { name: 'customer_id', type: 'integer' },
        { name: 'total_spend', type: 'float' },
    ]
  },
  { 
    id: 'dest-1', 
    name: 'Data Warehouse', 
    type: 'destination', 
    position: { x: 950, y: 150 },
    inputFields: [
        { name: 'customer_id', type: 'integer' },
        { name: 'total_spend', type: 'float' },
    ]
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
    category?: string;
    description?: string;
}

export const transformations = {
    sources: [
        { name: 'Database Source', icon: Database, description: "Connect to a SQL database." },
        { name: 'File Source', icon: FileText, description: "Use a file (CSV, JSON, etc.) as a source." }
    ],
    dataset: { name: 'Intermediate Dataset', icon: Layers, description: "Store intermediate results of a pipeline." },
    destination: { name: 'Data Warehouse', icon: DatabaseZap, description: "Load data into a data warehouse." },
    categories: [
        {
            name: "TRANSFORMATIONS DE NETTOYAGE (Data Cleaning)",
            items: [
                { name: 'Déduplication', icon: Trash2 },
                { name: 'Gestion des valeurs manquantes', icon: Replace },
                { name: 'Normalisation des formats', icon: Settings },
                { name: 'Correction des erreurs typographiques', icon: SpellCheck },
                { name: 'Validation et contrôle qualité', icon: CheckSquare },
                { name: 'Standardisation des chaînes', icon: CaseSensitive },
            ]
        },
        {
            name: "TRANSFORMATIONS STRUCTURELLES",
            items: [
                { name: 'Passe-plat (No-op)', icon: ArrowRightLeft, description: "A pass-through transformation that doesn't modify the data." },
                { name: 'Pivot/Unpivot', icon: UnfoldVertical },
                { name: 'Split/Merge colonnes', icon: Columns },
                { name: 'Transposition', icon: ArrowRightLeft },
                { name: 'Dénormalisation/Normalisation', icon: GitCommit },
                { name: 'Nested to flat', icon: FileJson },
                { name: 'Array operations', icon: Rows },
            ]
        },
        {
            name: "TRANSFORMATIONS D'AGRÉGATION",
            items: [
                { name: 'Agrégations numériques', icon: Sigma },
                { name: 'Group By', icon: Group },
                { name: 'Window functions', icon: Rows },
                { name: 'Binning', icon: BoxSelect },
                { name: 'Percentiles et quantiles', icon: BarChart3 },
                { name: 'Agrégations temporelles', icon: Clock },
            ]
        },
        {
            name: "JOINTURES ET UNIONS",
            items: [
                { name: 'Types de jointures', icon: GitCompare },
                { name: 'Self joins', icon: GitPullRequest },
                { name: 'Fuzzy matching', icon: Bot },
                { name: 'Union/Union All', icon: Combine },
                { name: 'Intersect/Except', icon: Unplug },
                { name: 'Lookup enrichment', icon: Search },
            ]
        },
        {
            name: "FILTRAGE ET SÉLECTION",
            items: [
                { name: 'Filtres conditionnels', icon: Filter },
                { name: 'Filtres temporels', icon: CalendarDays },
                { name: 'Filtres par expression régulière', icon: Pilcrow },
                { name: 'Top N/Bottom N', icon: SortAsc },
                { name: 'Échantillonnage', icon: Shuffle },
                { name: 'Distinct/Unique', icon: GitCommit },
            ]
        },
        {
            name: "TRANSFORMATIONS DE CALCUL",
            items: [
                { name: 'Opérations arithmétiques', icon: FunctionSquare },
                { name: 'Fonctions mathématiques', icon: Sigma },
                { name: 'Calculs conditionnels', icon: Milestone },
                { name: 'Calculs de colonnes dérivées', icon: Plus },
                { name: 'Conversions d\'unités', icon: Replace },
                { name: 'Formules personnalisées', icon: Pencil },
            ]
        },
        {
            name: "TRANSFORMATIONS TEMPORELLES",
            items: [
                { name: 'Extraction de composants', icon: Timer },
                { name: 'Calculs de durée', icon: Clock },
                { name: 'Formatage de dates', icon: CalendarDays },
                { name: 'Décalages temporels', icon: ArrowRightLeft },
                { name: 'Agrégations roulantes', icon: Rows },
                { name: 'Gestion des fuseaux horaires', icon: Globe },
            ]
        },
        {
            name: "TRANSFORMATIONS DE TEXTE",
            items: [
                { name: 'Manipulation de chaînes', icon: FileText },
                { name: 'Recherche et extraction', icon: Search },
                { name: 'Analyse de sentiment', icon: Bot },
                { name: 'Tokenisation', icon: WholeWord },
                { name: 'Normalisation linguistique', icon: SpellCheck },
                { name: 'Détection de langue', icon: Globe },
            ]
        },
        {
            name: "ENCODAGE ET CATÉGORISATION",
            items: [
                { name: 'One-hot encoding', icon: Hash },
                { name: 'Label encoding', icon: Pilcrow },
                { name: 'Binning numérique', icon: BoxSelect },
                { name: 'Feature scaling', icon: Sigma },
                { name: 'Hachage', icon: Fingerprint },
                { name: 'Mapping personnalisé', icon: GitCompare },
            ]
        },
        {
            name: "ENRICHISSEMENT EXTERNE",
            items: [
                { name: 'Géocoding', icon: Globe },
                { name: 'API calls', icon: Unplug },
                { name: 'Lookup tables', icon: Search },
                { name: 'Master data matching', icon: GitCompare },
                { name: 'Scoring et classification', icon: Bot },
                { name: 'Validation externe', icon: CheckSquare },
            ]
        },
        {
            name: "TRANSFORMATIONS DE SÉCURITÉ",
            items: [
                { name: 'Anonymisation', icon: Fingerprint },
                { name: 'Pseudonymisation', icon: Replace },
                { name: 'Masquage de données', icon: EyeOff },
                { name: 'Chiffrement/Déchiffrement', icon: KeyRound },
                { name: 'Tokenisation', icon: Lock },
                { name: 'Audit trail', icon: ClipboardList },
            ]
        },
        {
            name: "TRANSFORMATIONS CONDITIONNELLES",
            items: [
                { name: 'Routage conditionnel', icon: GitBranch },
                { name: 'Transformations multi-branches', icon: Milestone },
                { name: 'Validation avec exceptions', icon: CheckSquare },
                { name: 'Switch/Case statements', icon: CaseSensitive },
                { name: 'Transformations en cascade', icon: Rows },
            ]
        },
        {
            name: "TRANSFORMATIONS DE FORMAT",
            items: [
                { name: 'Conversion de types', icon: Replace },
                { name: 'Parsing de formats', icon: FileJson },
                { name: 'Sérialisation', icon: Code },
                { name: 'Compression/Décompression', icon: DatabaseBackup },
                { name: 'Conversion d\'encodage', icon: Pilcrow },
            ]
        },
        {
            name: "TRANSFORMATIONS STATISTIQUES",
            items: [
                { name: 'Z-score, outlier detection', icon: TestTube },
                { name: 'Distributions et histogrammes', icon: BarChart3 },
                { name: 'Corrélations et covariances', icon: Blend },
                { name: 'Tests statistiques automatisés', icon: Bot },
                { name: 'Sampling strategies', icon: Shuffle },
                { name: 'Data profiling', icon: Database },
            ]
        }
    ]
};
