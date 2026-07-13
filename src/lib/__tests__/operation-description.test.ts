import { describe, it, expect } from 'vitest';
import { describeOperationRule, isQualityOperation, operationControlType } from '../operation-description';
import { getPattern, renderPatternSql } from '../transformation-patterns';

describe('describeOperationRule', () => {
  it('describes a pass-through for missing/no-op operations', () => {
    expect(describeOperationRule(undefined)).toContain('Recopie directe');
    expect(describeOperationRule({ type: 'no_op', settings: {} })).toContain('Recopie directe');
  });

  it('spells out a filter as a business rule', () => {
    const rule = describeOperationRule({ type: 'filter', settings: { field: 'is_active', operator: '==', value: true } });
    expect(rule).toContain('is_active');
    expect(rule).toContain('==');
  });

  it('names the join type and condition', () => {
    const rule = describeOperationRule({
      type: 'join',
      settings: { leftNodeId: 'a', rightNodeId: 'b', joinType: 'inner', condition: { leftField: 'id', rightField: 'customer_id' } },
    });
    expect(rule).toContain('INNER');
    expect(rule).toContain('id = customer_id');
  });
});

describe('isQualityOperation', () => {
  it('recognises built-in quality operations', () => {
    expect(isQualityOperation({ type: 'deduplication', settings: { columns: [] } })).toBe(true);
    expect(isQualityOperation({ type: 'filter', settings: {} })).toBe(false);
  });

  it('recognises quality-category SQL patterns', () => {
    expect(isQualityOperation({ type: 'sql_pattern', settings: { patternId: 'pii_masking', params: {} } })).toBe(true);
    expect(isQualityOperation({ type: 'sql_pattern', settings: { patternId: 'scd_type_2', params: {} } })).toBe(false);
  });
});

describe('operationControlType', () => {
  it('maps operations to the mission-spec control taxonomy', () => {
    expect(operationControlType({ type: 'deduplication', settings: {} })).toBe('Unicité');
    expect(operationControlType({ type: 'handle_missing_values', settings: {} })).toBe('Complétude');
    expect(operationControlType({ type: 'sql_pattern', settings: { patternId: 'dedup_by_key', params: {} } })).toBe('Unicité');
  });
});

describe('renderPatternSql', () => {
  it('substitutes provided params and leaves missing ones as placeholders', () => {
    const pattern = getPattern('dedup_by_key')!;
    const sql = renderPatternSql(pattern, { key_columns: 'id', source_table: 'raw.users' });
    expect(sql).toContain('SELECT DISTINCT ON (id)');
    expect(sql).toContain('FROM raw.users');
    expect(sql).toContain('{timestamp_col}');
  });
});
