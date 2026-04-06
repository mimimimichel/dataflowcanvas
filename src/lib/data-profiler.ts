'use client';
/**
 * Data Profiler — generates Foundry-like profiling metrics for a dataset
 * Used by the Data Preview panel to show column stats, nulls, uniqueness
 */
import type { Field } from '@/lib/pipeline-data';

export interface ColumnProfile {
  name: string;
  type: string;
  completeness: number; // 0-100
  distinctCount: number;
  nullCount: number;
  min?: string;
  max?: string;
  mostCommon?: string;
}

export interface DatasetProfile {
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  overallQuality: number;
}

// Deterministic pseudo-random from seed
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 11) % 2147483647;
    return s / 2147483647;
  };
}

export function profileDataset(fields: Field[], nodeId: string, totalRows: number = 10000): DatasetProfile {
  const seed = hash(nodeId);
  const rng = seededRandom(seed);

  const columns: ColumnProfile[] = fields.map((f) => {
    const completeness = 80 + Math.floor(rng() * 20); // 80-99%
    const nullCount = Math.floor(totalRows * (1 - completeness / 100));
    const distinctCount = Math.floor(totalRows * (0.1 + rng() * 0.85));

    const type = f.type.toLowerCase();
    let min: string | undefined, max: string | undefined;

    if (type.includes('int') || type.includes('float') || type.includes('double') || type.includes('number')) {
      const base = Math.floor(rng() * 1000);
      min = String(base - Math.floor(rng() * 100));
      max = String(base + Math.floor(rng() * 200));
    } else if (type.includes('date') || type.includes('timestamp')) {
      min = '2023-01-01';
      max = '2025-12-31';
    }

    const mostCommonOptions = ['ACTIVE', 'PENDING', 'COMPLETED', 'CANCELLED'];
    const mostCommon = type === 'string' ? mostCommonOptions[Math.floor(rng() * mostCommonOptions.length)] : undefined;

    return { name: f.name, type: f.type, completeness, distinctCount, nullCount, min, max, mostCommon };
  });

  const overallQuality = columns.length > 0
    ? Math.round(columns.reduce((s, c) => s + c.completeness, 0) / columns.length)
    : 100;

  return { rowCount: totalRows, columnCount: fields.length, columns, overallQuality };
}

export function qualityColor(pct: number): string {
  if (pct >= 95) return 'text-emerald-500';
  if (pct >= 85) return 'text-amber-500';
  return 'text-red-500';
}

export function qualityBadge(pct: number): { bg: string; text: string } {
  if (pct >= 95) return { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-400' };
  if (pct >= 85) return { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-400' };
  return { bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-400' };
}
