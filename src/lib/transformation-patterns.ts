import type { LucideIcon } from 'lucide-react';
import {
  Copy, GitBranch, DatabaseBackup, UnfoldVertical, GitPullRequest, Sigma,
  Pencil, Activity, Filter, KeyRound, FileJson, TestTube, CalendarDays,
  XCircle, Blend, Lock,
} from 'lucide-react';
import type { TransformationCategory, TransformationItem } from './pipeline-data';

export type PatternCategory = 'quality' | 'modeling' | 'loading';

export interface PatternParameter {
  name: string;
  label: string;
  type: 'string';
  placeholder: string;
  required: boolean;
}

export interface TransformationPattern {
  id: string;
  name: string;
  description: string;
  category: PatternCategory;
  icon: LucideIcon;
  /** SQL template with {param_name} placeholders, filled in at export time. */
  sql: string;
  parameters: PatternParameter[];
}

/**
 * Reusable SQL transformation patterns (dedup, SCD2, incremental load...),
 * ported from Theseus's transformation library. Selected on a canvas node
 * via the 'sql_pattern' operation and rendered verbatim into the dbt export.
 */
export const transformationPatterns: TransformationPattern[] = [
  {
    id: 'dedup_by_key',
    name: 'Deduplication by key',
    description: 'Removes duplicates, keeping the most recent row per primary key.',
    category: 'quality',
    icon: Copy,
    sql: `SELECT DISTINCT ON ({key_columns})
    *
FROM {source_table}
ORDER BY {key_columns}, {timestamp_col} DESC`,
    parameters: [
      { name: 'key_columns', label: 'Key columns', type: 'string', placeholder: 'id, email', required: true },
      { name: 'source_table', label: 'Source table', type: 'string', placeholder: 'raw.users', required: true },
      { name: 'timestamp_col', label: 'Timestamp column', type: 'string', placeholder: 'updated_at', required: true },
    ],
  },
  {
    id: 'scd_type_2',
    name: 'SCD Type 2',
    description: 'Adds SCD Type 2 versioning columns (valid_from, valid_to, is_current).',
    category: 'modeling',
    icon: GitBranch,
    sql: `SELECT
    {columns},
    CURRENT_DATE AS valid_from,
    '9999-12-31'::date AS valid_to,
    TRUE AS is_current
FROM {source_table}`,
    parameters: [
      { name: 'columns', label: 'Columns to keep', type: 'string', placeholder: 'id, name, status', required: true },
      { name: 'source_table', label: 'Source table', type: 'string', placeholder: 'raw.customers', required: true },
    ],
  },
  {
    id: 'incremental_load',
    name: 'Incremental load',
    description: 'Loads only new rows since the last run.',
    category: 'loading',
    icon: DatabaseBackup,
    sql: `SELECT *
FROM {source_table}
WHERE {timestamp_col} > (
    SELECT COALESCE(MAX({timestamp_col}), '1970-01-01'::timestamp)
    FROM {target_table}
)`,
    parameters: [
      { name: 'source_table', label: 'Source table', type: 'string', placeholder: 'raw.events', required: true },
      { name: 'target_table', label: 'Target table', type: 'string', placeholder: 'stg.events', required: true },
      { name: 'timestamp_col', label: 'Timestamp column', type: 'string', placeholder: 'created_at', required: true },
    ],
  },
  {
    id: 'pivot_wide',
    name: 'Pivot to wide format',
    description: 'Turns rows into columns.',
    category: 'modeling',
    icon: UnfoldVertical,
    sql: `SELECT
    {entity_id},
    {pivot_expressions}
FROM {source_table}
GROUP BY {entity_id}`,
    parameters: [
      { name: 'entity_id', label: 'Entity id', type: 'string', placeholder: 'user_id', required: true },
      { name: 'pivot_expressions', label: 'Pivot expressions', type: 'string', placeholder: "SUM(CASE WHEN metric = 'revenue' THEN value END) AS revenue", required: true },
      { name: 'source_table', label: 'Source table', type: 'string', placeholder: 'raw.metrics', required: true },
    ],
  },
  {
    id: 'multi_source_join',
    name: 'Multi-source join',
    description: 'Joins several tables on their foreign keys.',
    category: 'modeling',
    icon: GitPullRequest,
    sql: `SELECT
    a.*,
    {joined_columns}
FROM {main_table} a
{join_clauses}`,
    parameters: [
      { name: 'main_table', label: 'Main table', type: 'string', placeholder: 'raw.orders', required: true },
      { name: 'joined_columns', label: 'Joined columns', type: 'string', placeholder: 'c.name AS customer_name, p.title AS product_title', required: true },
      { name: 'join_clauses', label: 'JOIN clauses', type: 'string', placeholder: 'LEFT JOIN raw.customers c ON a.customer_id = c.id', required: true },
    ],
  },
  {
    id: 'business_aggregate',
    name: 'Business aggregate',
    description: 'Aggregates metrics by business dimensions.',
    category: 'modeling',
    icon: Sigma,
    sql: `SELECT
    {group_by_columns},
    {aggregate_expressions}
FROM {source_table}
GROUP BY {group_by_columns}`,
    parameters: [
      { name: 'group_by_columns', label: 'Group by columns', type: 'string', placeholder: 'date, region, product', required: true },
      { name: 'aggregate_expressions', label: 'Aggregate expressions', type: 'string', placeholder: 'SUM(revenue) AS total_revenue, COUNT(*) AS row_count', required: true },
      { name: 'source_table', label: 'Source table', type: 'string', placeholder: 'stg.sales', required: true },
    ],
  },
  {
    id: 'cast_and_clean',
    name: 'Cast & clean types',
    description: 'Casts types and cleans up null values.',
    category: 'quality',
    icon: Pencil,
    sql: `SELECT
    {cast_expressions},
    {other_columns}
FROM {source_table}`,
    parameters: [
      { name: 'cast_expressions', label: 'Cast expressions', type: 'string', placeholder: 'CAST(price AS DECIMAL(10,2)), TRIM(name)', required: true },
      { name: 'other_columns', label: 'Other columns', type: 'string', placeholder: 'id, created_at', required: true },
      { name: 'source_table', label: 'Source table', type: 'string', placeholder: 'raw.products', required: true },
    ],
  },
  {
    id: 'window_functions',
    name: 'Window functions',
    description: 'Adds windowed calculations (rank, running total...).',
    category: 'modeling',
    icon: Activity,
    sql: `SELECT
    *,
    ROW_NUMBER() OVER (
        PARTITION BY {partition_cols}
        ORDER BY {order_col} DESC
    ) AS rn,
    SUM({metric}) OVER (
        PARTITION BY {partition_cols}
        ORDER BY {order_col}
    ) AS running_total
FROM {source_table}`,
    parameters: [
      { name: 'partition_cols', label: 'Partition columns', type: 'string', placeholder: 'customer_id', required: true },
      { name: 'order_col', label: 'Order column', type: 'string', placeholder: 'order_date', required: true },
      { name: 'metric', label: 'Metric', type: 'string', placeholder: 'amount', required: true },
      { name: 'source_table', label: 'Source table', type: 'string', placeholder: 'stg.orders', required: true },
    ],
  },
  {
    id: 'scope_filter',
    name: 'Business scope filter',
    description: 'Filters data down to the relevant business scope.',
    category: 'quality',
    icon: Filter,
    sql: `SELECT *
FROM {source_table}
WHERE {filter_conditions}`,
    parameters: [
      { name: 'source_table', label: 'Source table', type: 'string', placeholder: 'raw.events', required: true },
      { name: 'filter_conditions', label: 'Filter conditions', type: 'string', placeholder: "status = 'active' AND created_at >= '2024-01-01'", required: true },
    ],
  },
  {
    id: 'surrogate_key',
    name: 'Surrogate key',
    description: 'Generates a technical surrogate key.',
    category: 'modeling',
    icon: KeyRound,
    sql: `SELECT
    ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS {key_name},
    *
FROM {source_table}`,
    parameters: [
      { name: 'key_name', label: 'Key name', type: 'string', placeholder: 'sk_id', required: true },
      { name: 'source_table', label: 'Source table', type: 'string', placeholder: 'stg.customers', required: true },
    ],
  },
  {
    id: 'flatten_json',
    name: 'Flatten JSON',
    description: 'Flattens JSON columns into relational columns.',
    category: 'modeling',
    icon: FileJson,
    sql: `SELECT
    {scalar_columns},
    json_extract_text({json_col}, '{nested_key}') AS {nested_alias}
FROM {source_table}`,
    parameters: [
      { name: 'scalar_columns', label: 'Scalar columns', type: 'string', placeholder: 'id, created_at', required: true },
      { name: 'json_col', label: 'JSON column', type: 'string', placeholder: 'metadata', required: true },
      { name: 'nested_key', label: 'Nested key', type: 'string', placeholder: 'plan', required: true },
      { name: 'nested_alias', label: 'Alias', type: 'string', placeholder: 'plan', required: true },
      { name: 'source_table', label: 'Source table', type: 'string', placeholder: 'raw.users', required: true },
    ],
  },
  {
    id: 'row_quality_tests',
    name: 'Row-level quality tests',
    description: 'Adds per-row data quality check columns.',
    category: 'quality',
    icon: TestTube,
    sql: `SELECT
    *,
    CASE
        WHEN {column} IS NULL THEN 'FAIL: null value'
        WHEN {column} <= 0 THEN 'FAIL: non-positive'
        ELSE 'PASS'
    END AS {column}_quality_check
FROM {source_table}`,
    parameters: [
      { name: 'column', label: 'Column to test', type: 'string', placeholder: 'revenue', required: true },
      { name: 'source_table', label: 'Source table', type: 'string', placeholder: 'stg.sales', required: true },
    ],
  },
  {
    id: 'date_spine',
    name: 'Date spine',
    description: 'Fills gaps in a time series.',
    category: 'modeling',
    icon: CalendarDays,
    sql: `WITH date_spine AS (
    SELECT generate_series(
        '{start_date}'::date,
        '{end_date}'::date,
        '1 day'::interval
    )::date AS date_day
)
SELECT
    d.date_day,
    {measures}
FROM date_spine d
LEFT JOIN {source_table} s ON d.date_day = s.{date_col}
GROUP BY d.date_day`,
    parameters: [
      { name: 'start_date', label: 'Start date', type: 'string', placeholder: '2024-01-01', required: true },
      { name: 'end_date', label: 'End date', type: 'string', placeholder: '2024-12-31', required: true },
      { name: 'measures', label: 'Measures', type: 'string', placeholder: 'SUM(s.revenue) AS revenue', required: true },
      { name: 'source_table', label: 'Source table', type: 'string', placeholder: 'stg.daily_sales', required: true },
      { name: 'date_col', label: 'Date column', type: 'string', placeholder: 'sale_date', required: true },
    ],
  },
  {
    id: 'soft_delete_filter',
    name: 'Soft delete filter',
    description: 'Excludes records marked as deleted.',
    category: 'quality',
    icon: XCircle,
    sql: `SELECT *
FROM {source_table}
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND deleted_at IS NULL`,
    parameters: [
      { name: 'source_table', label: 'Source table', type: 'string', placeholder: 'raw.users', required: true },
    ],
  },
  {
    id: 'currency_conversion',
    name: 'Currency conversion',
    description: 'Converts amounts into a reference currency.',
    category: 'modeling',
    icon: Blend,
    sql: `SELECT
    *,
    {amount_col} * COALESCE(e.rate, 1.0) AS {amount_col}_eur
FROM {source_table} t
LEFT JOIN ref.exchange_rates e
    ON t.currency = e.currency
    AND t.{date_col} = e.rate_date`,
    parameters: [
      { name: 'amount_col', label: 'Amount column', type: 'string', placeholder: 'amount', required: true },
      { name: 'source_table', label: 'Source table', type: 'string', placeholder: 'stg.transactions', required: true },
      { name: 'date_col', label: 'Date column', type: 'string', placeholder: 'transaction_date', required: true },
    ],
  },
  {
    id: 'pii_masking',
    name: 'PII masking',
    description: 'Masks personal data (email, phone, name).',
    category: 'quality',
    icon: Lock,
    sql: `SELECT
    id,
    CONCAT(LEFT({name_col}, 1), '***') AS {name_col}_masked,
    CONCAT(LEFT({email_col}, 2), '***@', SPLIT_PART({email_col}, '@', 2)) AS {email_col}_masked,
    CONCAT('***-***-', RIGHT({phone_col}, 4)) AS {phone_col}_masked,
    {other_columns}
FROM {source_table}`,
    parameters: [
      { name: 'name_col', label: 'Name column', type: 'string', placeholder: 'full_name', required: true },
      { name: 'email_col', label: 'Email column', type: 'string', placeholder: 'email', required: true },
      { name: 'phone_col', label: 'Phone column', type: 'string', placeholder: 'phone', required: true },
      { name: 'other_columns', label: 'Other columns', type: 'string', placeholder: 'id, created_at, country', required: true },
      { name: 'source_table', label: 'Source table', type: 'string', placeholder: 'raw.users', required: true },
    ],
  },
];

const PATTERN_CATEGORY_LABELS: Record<PatternCategory, string> = {
  quality: 'SQL Patterns — Quality',
  modeling: 'SQL Patterns — Modeling',
  loading: 'SQL Patterns — Loading',
};

/** Catalogue sections exposing each pattern as a draggable 'sql_pattern' transformation node. */
export const patternCatalogueCategories: TransformationCategory[] = (['quality', 'modeling', 'loading'] as PatternCategory[])
  .map(category => ({
    category: PATTERN_CATEGORY_LABELS[category],
    items: transformationPatterns
      .filter(p => p.category === category)
      .map((p): TransformationItem => ({
        name: p.name,
        icon: p.icon,
        type: 'transformation',
        operationType: 'sql_pattern',
        description: p.description,
        defaultSettings: { patternId: p.id, params: {} },
      })),
  }))
  .filter(c => c.items.length > 0);

export function getPattern(patternId: string): TransformationPattern | undefined {
  return transformationPatterns.find(p => p.id === patternId);
}

/** Fills a pattern's SQL template with the given params, leaving unresolved {placeholders} as-is. */
export function renderPatternSql(pattern: TransformationPattern, params: Record<string, string>): string {
  return pattern.sql.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value && value.trim().length > 0 ? value : match;
  });
}
