
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

export type OperationType = 'filter' | 'join' | 'group_by' | 'sort' | string;

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


export type Operation = FilterOperation | JoinOperation | GroupByOperation | SortOperation | BaseOperation;

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
        { name: 'Filtrer', icon: Filter, operationType: 'filter', description: "Filtrer des lignes selon une ou plusieurs conditions." },
        { name: 'Joindre', icon: GitCompare, operationType: 'join', description: "Combiner des données de deux sources différentes." },
        { name: 'Agréger', icon: Group, operationType: 'group_by', description: "Regrouper des données et appliquer des fonctions d'agrégation (SUM, AVG...)." },
        { name: 'Trier', icon: SortAsc, operationType: 'sort', description: "Trier les données selon une ou plusieurs colonnes." },
        { name: 'Sélectionner des colonnes', icon: Table, operationType: 'select_columns', description: "Choisir les colonnes à conserver ou à exclure." },
        { name: 'Union', icon: Combine, operationType: 'union', description: "Combiner les lignes de deux sources de données." },
        { name: 'Passe-plat (No-op)', icon: ArrowRightLeft, operationType: 'no_op', description: "A pass-through transformation that doesn't modify the data." },
    ],
};

export const advancedTransformations: TransformationCategory[] = [
    {
        category: 'Nettoyage et Qualité',
        items: [
            { name: 'Déduplication', icon: Trash2, operationType: 'deduplication', description: 'Supprimer les doublons.' },
            { name: 'Gestion des valeurs manquantes', icon: Replace, operationType: 'handle_missing_values', description: 'Remplacer ou supprimer les valeurs nulles.' },
            { name: 'Normalisation des formats', icon: Settings, operationType: 'normalize_formats', description: 'Standardiser les formats de données (dates, nombres...).' },
            { name: 'Correction des erreurs typographiques', icon: SpellCheck, operationType: 'fix_typos', description: 'Corriger les fautes de frappe courantes.' },
            { name: 'Validation et contrôle qualité', icon: CheckSquare, operationType: 'quality_control', description: 'Valider les données contre des règles définies.' },
            { name: 'Standardisation des chaînes', icon: CaseSensitive, operationType: 'standardize_strings', description: 'Mettre en majuscules, minuscules, etc.' },
        ]
    },
    {
        category: 'Transformations structurelles',
        items: [
            { name: 'Pivot/Unpivot', icon: UnfoldVertical, operationType: 'pivot_unpivot', description: 'Pivoter des lignes en colonnes et vice-versa.' },
            { name: 'Split/Merge colonnes', icon: Columns, operationType: 'split_merge_columns', description: 'Diviser ou fusionner des colonnes.' },
            { name: 'Transposition', icon: ArrowRightLeft, operationType: 'transpose', description: 'Inverser les lignes et les colonnes.' },
            { name: 'Dénormalisation/Normalisation', icon: GitCommit, operationType: 'denormalize', description: 'Modifier la structure de la base de données.' },
            { name: 'Nested to flat', icon: FileJson, operationType: 'nested_to_flat', description: 'Aplatir des structures JSON ou imbriquées.' },
            { name: 'Array operations', icon: Rows, operationType: 'array_operations', description: 'Opérations sur les tableaux (explode, etc.).' },
        ]
    },
    {
        category: 'Agrégations et calculs',
        items: [
            { name: 'Agrégations numériques', icon: Sigma, operationType: 'numeric_aggregation', description: 'Calculs statistiques avancés.' },
            { name: 'Window functions', icon: Rows, operationType: 'window_functions', description: 'Calculs sur des fenêtres de données (ex: moyenne mobile).' },
            { name: 'Binning', icon: BoxSelect, operationType: 'binning', description: 'Regrouper des valeurs en intervalles.' },
            { name: 'Percentiles et quantiles', icon: BarChart3, operationType: 'percentiles', description: 'Calculer des percentiles.' },
            { name: 'Agrégations temporelles', icon: Clock, operationType: 'temporal_aggregation', description: 'Agréger des données par période de temps.' },
            { name: 'Self joins', icon: GitPullRequest, operationType: 'self_join', description: 'Joindre une table avec elle-même.' },
        ]
    },
    {
        category: 'Enrichissement et filtres avancés',
        items: [
            { name: 'Fuzzy matching', icon: Bot, operationType: 'fuzzy_matching', description: 'Faire correspondre des chaînes de caractères similaires.' },
            { name: 'Intersect/Except', icon: Unplug, operationType: 'intersect_except', description: 'Opérations d\'ensemble sur les données.' },
            { name: 'Lookup enrichment', icon: Search, operationType: 'lookup_enrichment', description: 'Enrichir des données à partir d\'une table de référence.' },
            { name: 'Filtres temporels', icon: CalendarDays, operationType: 'temporal_filter', description: 'Filtrer par dates ou périodes.' },
            { name: 'Filtres par expression régulière', icon: Pilcrow, operationType: 'regex_filter', description: 'Filtrer en utilisant des expressions régulières.' },
            { name: 'Top N/Bottom N', icon: SortAsc, operationType: 'top_n', description: 'Sélectionner les N premières ou dernières lignes.' },
            { name: 'Échantillonnage', icon: Shuffle, operationType: 'sampling', description: 'Prélever un échantillon de données.' },
            { name: 'Distinct/Unique', icon: GitCommit, operationType: 'distinct', description: 'Obtenir les valeurs uniques.' },
        ]
    },
    {
        category: 'Fonctions personnalisées et calculs',
        items: [
            { name: 'Opérations arithmétiques', icon: FunctionSquare, operationType: 'arithmetic', description: 'Addition, soustraction, etc.' },
            { name: 'Fonctions mathématiques', icon: Sigma, operationType: 'math_functions', description: 'Fonctions mathématiques (log, exp...).' },
            { name: 'Calculs conditionnels', icon: Milestone, operationType: 'conditional_calculation', description: 'Calculs basés sur des conditions (IF/ELSE).' },
            { name: 'Calculs de colonnes dérivées', icon: Plus, operationType: 'derived_columns', description: 'Créer de nouvelles colonnes à partir d\'autres.' },
            { name: 'Conversions d\'unités', icon: Replace, operationType: 'unit_conversion', description: 'Convertir des unités de mesure.' },
            { name: 'Formules personnalisées', icon: Pencil, operationType: 'custom_formula', description: 'Appliquer une formule personnalisée.' },
        ]
    },
    {
        category: 'Données temporelles',
        items: [
            { name: 'Extraction de composants', icon: Timer, operationType: 'date_part_extraction', description: 'Extraire année, mois, jour, etc.' },
            { name: 'Calculs de durée', icon: Clock, operationType: 'duration_calculation', description: 'Calculer des durées entre deux dates.' },
            { name: 'Formatage de dates', icon: CalendarDays, operationType: 'date_formatting', description: 'Changer le format d\'affichage des dates.' },
            { name: 'Décalages temporels', icon: ArrowRightLeft, operationType: 'time_shifting', description: 'Décaler des données dans le temps.' },
            { name: 'Agrégations roulantes', icon: Rows, operationType: 'rolling_aggregations', description: 'Agréger des données sur une fenêtre glissante.' },
            { name: 'Gestion des fuseaux horaires', icon: Globe, operationType: 'timezone_handling', description: 'Convertir entre fuseaux horaires.' },
        ]
    },
    {
        category: 'Traitement de texte et NLP',
        items: [
            { name: 'Manipulation de chaînes', icon: FileText, operationType: 'string_manipulation', description: 'Concaténation, sous-chaîne, etc.' },
            { name: 'Recherche et extraction', icon: Search, operationType: 'text_search_extract', description: 'Extraire du texte avec des motifs.' },
            { name: 'Analyse de sentiment', icon: Bot, operationType: 'sentiment_analysis', description: 'Déterminer le sentiment d\'un texte.' },
            { name: 'Tokenisation', icon: WholeWord, operationType: 'tokenization', description: 'Diviser le texte en mots ou phrases.' },
            { name: 'Normalisation linguistique', icon: SpellCheck, operationType: 'linguistic_normalization', description: 'Lemmatisation, etc.' },
            { name: 'Détection de langue', icon: Globe, operationType: 'language_detection', description: 'Identifier la langue d\'un texte.' },
        ]
    },
    {
        category: 'Machine Learning et préparation des données',
        items: [
            { name: 'One-hot encoding', icon: Hash, operationType: 'one_hot_encoding', description: 'Convertir des variables catégorielles en format binaire.' },
            { name: 'Label encoding', icon: Pilcrow, operationType: 'label_encoding', description: 'Attribuer une valeur numérique à chaque catégorie.' },
            { name: 'Binning numérique', icon: BoxSelect, operationType: 'numeric_binning', description: 'Convertir des variables numériques en catégories.' },
            { name: 'Feature scaling', icon: Sigma, operationType: 'feature_scaling', description: 'Mettre à l\'échelle les caractéristiques (min-max, standard...).' },
            { name: 'Hachage', icon: Fingerprint, operationType: 'hashing', description: 'Hacher des caractéristiques.' },
            { name: 'Mapping personnalisé', icon: GitCompare, operationType: 'custom_mapping', description: 'Appliquer des mappages personnalisés.' },
        ]
    },
    {
        category: 'Intégration et enrichissement externe',
        items: [
            { name: 'Géocoding', icon: Globe, operationType: 'geocoding', description: 'Convertir des adresses en coordonnées GPS.' },
            { name: 'API calls', icon: Unplug, operationType: 'api_calls', description: 'Appeler des API externes pour enrichir les données.' },
            { name: 'Lookup tables', icon: Search, operationType: 'lookup_tables', description: 'Rechercher des valeurs dans des tables externes.' },
            { name: 'Master data matching', icon: GitCompare, operationType: 'master_data_matching', description: 'Faire correspondre avec des données de référence.' },
            { name: 'Scoring et classification', icon: Bot, operationType: 'scoring_classification', description: 'Appliquer un modèle de scoring.' },
            { name: 'Validation externe', icon: CheckSquare, operationType: 'external_validation', description: 'Valider des données via un service externe.' },
        ]
    },
    {
        category: 'Sécurité et conformité',
        items: [
            { name: 'Anonymisation', icon: Fingerprint, operationType: 'anonymization', description: 'Supprimer les informations personnelles.' },
            { name: 'Pseudonymisation', icon: Replace, operationType: 'pseudonymization', description: 'Remplacer les identifiants par des pseudonymes.' },
            { name: 'Masquage de données', icon: EyeOff, operationType: 'data_masking', description: 'Masquer des parties de données sensibles.' },
            { name: 'Chiffrement/Déchiffrement', icon: KeyRound, operationType: 'encryption', description: 'Chiffrer ou déchiffrer des données.' },
            { name: 'Tokenisation', icon: Lock, operationType: 'security_tokenization', description: 'Remplacer des données sensibles par des jetons.' },
            { name: 'Audit trail', icon: ClipboardList, operationType: 'audit_trail', description: 'Générer une piste d\'audit.' },
        ]
    },
    {
        category: 'Logique de flux et de contrôle',
        items: [
            { name: 'Routage conditionnel', icon: GitBranch, operationType: 'conditional_routing', description: 'Orienter les données selon des conditions.' },
            { name: 'Transformations multi-branches', icon: Milestone, operationType: 'multi_branch', description: 'Appliquer différentes transformations en parallèle.' },
            { name: 'Validation avec exceptions', icon: CheckSquare, operationType: 'validation_with_exceptions', description: 'Gérer les exceptions de validation.' },
            { name: 'Switch/Case statements', icon: CaseSensitive, operationType: 'switch_case', description: 'Logique de type switch/case.' },
            { name: 'Transformations en cascade', icon: Rows, operationType: 'cascading_transforms', description: 'Enchaîner plusieurs transformations simples.' },
        ]
    },
    {
        category: 'Formatage et conversion de types',
        items: [
            { name: 'Conversion de types', icon: Replace, operationType: 'type_conversion', description: 'Convertir le type de données (string, int...).' },
            { name: 'Parsing de formats', icon: FileJson, operationType: 'format_parsing', description: 'Analyser des formats complexes (JSON, XML...).' },
            { name: 'Sérialisation', icon: Code, operationType: 'serialization', description: 'Convertir des données en format série.' },
            { name: 'Compression/Décompression', icon: DatabaseBackup, operationType: 'compression', description: 'Compresser ou décompresser des données.' },
            { name: 'Conversion d\'encodage', icon: Pilcrow, operationType: 'encoding_conversion', description: 'Changer l\'encodage des caractères.' },
        ]
    },
    {
        category: 'Analyses statistiques',
        items: [
            { name: 'Z-score, outlier detection', icon: TestTube, operationType: 'outlier_detection', description: 'Détecter les valeurs aberrantes.' },
            { name: 'Distributions et histogrammes', icon: BarChart3, operationType: 'histogram', description: 'Générer des histogrammes.' },
            { name: 'Corrélations et covariances', icon: Blend, operationType: 'correlation', description: 'Calculer les corrélations.' },
            { name: 'Tests statistiques automatisés', icon: Bot, operationType: 'statistical_tests', description: 'Effectuer des tests statistiques.' },
            { name: 'Sampling strategies', icon: Shuffle, operationType: 'sampling_strategies', description: 'Stratégies d\'échantillonnage avancées.' },
            { name: 'Data profiling', icon: Database, operationType: 'data_profiling', description: 'Analyser le profil des données.' },
        ]
    }
];
