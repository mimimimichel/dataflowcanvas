import { Field, NodeType, Operation, PipelineNode } from '@/lib/pipeline-data';

export interface DistributionBucket {
  value: string;
  count: number;
}

export interface DataProfile {
  totalRows: number;
  rowCount: number;
  nullRate: Record<string, number>;
  uniqueValues: Record<string, number>;
  distributions: Record<string, { buckets: DistributionBucket[] }>;
  sampleRows: Array<Record<string, any>>;
  qualityScore: number;
  schema: { name: string; type: string }[];
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function generateRandomColumnStats(field: Field): {
  nullRate: number;
  uniqueCount: number;
  distribution: DistributionBucket[];
  min?: string | number;
  max?: string | number;
  mean?: number;
} {
  const rng = seededRandom(hashStr(field.name + field.type));
  const nullRate = Math.round(rng() * 15 * 10) / 10;

  let uniqueCount = 50;
  let distribution: DistributionBucket[] = [];
  let min: string | number | undefined;
  let max: string | number | undefined;
  let mean: number | undefined;

  const typeLower = field.type.toLowerCase();

  if (typeLower.includes('int') || typeLower.includes('float') || typeLower.includes('number') || typeLower.includes('double')) {
    uniqueCount = Math.floor(rng() * 200) + 50;
    const rangeMin = Math.floor(rng() * 1000);
    const rangeMax = rangeMin + Math.floor(rng() * 10000) + 100;
    min = rangeMin;
    max = rangeMax;
    mean = Math.round(((rangeMin + rangeMax) / 2 + (rng() - 0.5) * 100) * 100) / 100;
    const bucketCount = Math.min(uniqueCount, 10);
    const step = Math.floor((rangeMax - rangeMin) / bucketCount);
    distribution = Array.from({ length: bucketCount }, (_, i) => ({
      value: `${rangeMin + i * step}-${rangeMin + (i + 1) * step}`,
      count: Math.floor(rng() * 500) + 50,
    }));
  } else if (typeLower.includes('date') || typeLower.includes('time')) {
    uniqueCount = Math.floor(rng() * 100) + 20;
    const baseDate = new Date(2024, 0, 1);
    const days = Math.floor(rng() * 365);
    min = baseDate.toISOString().split('T')[0];
    max = new Date(2024, 0, 1 + days).toISOString().split('T')[0];
    const buckets = ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4'];
    distribution = buckets.map(b => ({ value: b, count: Math.floor(rng() * 300) + 50 }));
  } else if (typeLower.includes('bool')) {
    uniqueCount = 2;
    const trueCount = Math.floor(rng() * 800) + 100;
    const falseCount = Math.floor(rng() * 800) + 100;
    distribution = [
      { value: 'true', count: trueCount },
      { value: 'false', count: falseCount },
    ];
  } else {
    uniqueCount = Math.floor(rng() * 300) + 50;
    const sampleValues = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'];
    const numBuckets = Math.min(uniqueCount, 8);
    distribution = sampleValues.slice(0, numBuckets).map(v => ({
      value: v,
      count: Math.floor(rng() * 400) + 50,
    }));
  }

  return { nullRate, uniqueCount, distribution, min, max, mean };
}

function estimateRowsFromNode(node: PipelineNode): number {
  if (!node.operation) return 1000;
  const baseRows = 1000;
  switch (node.operation.type) {
    case 'filter':
      return Math.floor(baseRows * 0.6);
    case 'group_by': {
      const op = node.operation as any;
      const groupFields = op.settings?.groupByFields || [];
      return Math.max(5, Math.floor(baseRows / (groupFields.length + 1) ** 1.5));
    }
    case 'join':
      return Math.floor(baseRows * 0.8);
    case 'select_columns':
      return baseRows;
    case 'sort':
      return baseRows;
    case 'union':
      return Math.floor(baseRows * 1.5);
    case 'deduplication':
      return Math.floor(baseRows * 0.7);
    case 'handle_missing_values':
      return Math.floor(baseRows * 0.85);
    default:
      return baseRows;
  }
}

export function simulateDataProfile(
  fields: Field[],
  operationType: string,
  node?: PipelineNode
): DataProfile {
  const totalRows = node ? estimateRowsFromNode(node) : 1000;
  const rng = seededRandom(hashStr(operationType + (node?.id || '')));

  const nullRate: Record<string, number> = {};
  const uniqueValues: Record<string, number> = {};
  const distributions: Record<string, { buckets: DistributionBucket[] }> = {};
  const schema: { name: string; type: string }[] = [];

  fields.forEach((field) => {
    const stats = generateRandomColumnStats(field);
    nullRate[field.name] = stats.nullRate;
    uniqueValues[field.name] = stats.uniqueCount;
    distributions[field.name] = { buckets: stats.distribution };
    schema.push({ name: field.name, type: field.type });
  });

  const sampleRow: Record<string, any> = {};
  fields.forEach((field) => {
    const typeLower = field.type.toLowerCase();
    if (typeLower.includes('int')) {
      sampleRow[field.name] = Math.floor(rng() * 10000);
    } else if (typeLower.includes('float') || typeLower.includes('double')) {
      sampleRow[field.name] = Math.round(rng() * 10000 * 100) / 100;
    } else if (typeLower.includes('bool')) {
      sampleRow[field.name] = rng() > 0.5;
    } else if (typeLower.includes('date')) {
      const d = new Date(2024, Math.floor(rng() * 12), Math.floor(rng() * 28) + 1);
      sampleRow[field.name] = d.toISOString().split('T')[0];
    } else {
      const words = ['customer', 'order', 'product', 'service', 'account', 'record', 'item', 'data'];
      sampleRow[field.name] = words[Math.floor(rng() * words.length)] + '_' + Math.floor(rng() * 1000);
    }
  });

  const sampleRows = Array.from({ length: 3 }, (_, i) => {
    const row: Record<string, any> = {};
    fields.forEach((field) => {
      const typeLower = field.type.toLowerCase();
      const r = seededRandom(hashStr(field.name + i.toString()));
      if (typeLower.includes('int')) {
        row[field.name] = Math.floor(r() * 10000);
      } else if (typeLower.includes('float') || typeLower.includes('double')) {
        row[field.name] = Math.round(r() * 10000 * 100) / 100;
      } else if (typeLower.includes('bool')) {
        row[field.name] = r() > 0.5;
      } else if (typeLower.includes('date')) {
        const d = new Date(2024, Math.floor(r() * 12), Math.floor(r() * 28) + 1);
        row[field.name] = d.toISOString().split('T')[0];
      } else {
        const words = ['customer', 'order', 'product', 'service', 'account', 'record', 'item', 'data'];
        row[field.name] = words[Math.floor(r() * words.length)] + '_' + Math.floor(r() * 1000);
      }
    });
    return row;
  });

  const avgNullRate = Object.values(nullRate).reduce((a, b) => a + b, 0) / (Object.keys(nullRate).length || 1);
  const qualityScore = Math.round(Math.max(0, Math.min(100, 100 - avgNullRate * 3 - (1000 - totalRows) / 50)));

  return {
    totalRows,
    rowCount: totalRows,
    nullRate,
    uniqueValues,
    distributions,
    sampleRows,
    qualityScore,
    schema,
  };
}
