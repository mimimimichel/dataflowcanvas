import {
  PipelineNode, Connector, Field, ComplianceAuditResult, ComplianceIssue,
  ComplianceDimensionKey, ComplianceDimensionResult, COMPLIANCE_DIMENSION_WEIGHTS,
  COMPLIANCE_DIMENSION_LABELS, scoreToGrade,
} from './pipeline-data';

const PII_FIELD_PATTERN = /email|phone|ssn|social_security|address|full_name|first_name|last_name|dob|date_of_birth|password|credit_card|iban|ip_address/i;
const GENERIC_NAME_PATTERN = /^(new node|untitled|node ?\d*|unnamed)$/i;
const QUALITY_OPERATION_TYPES = new Set([
  'deduplication', 'handle_missing_values', 'quality_control', 'standardize_strings', 'normalize_formats', 'fix_typos',
]);

function clamp(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function ratio(passed: number, total: number): number {
  return total === 0 ? 100 : (passed / total) * 100;
}

function hasCycle(nodes: PipelineNode[], connectors: Connector[]): boolean {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  let cyclic = false;
  const visit = (id: string) => {
    if (cyclic || visited.has(id)) return;
    if (visiting.has(id)) { cyclic = true; return; }
    visiting.add(id);
    connectors.filter(c => c.from === id).forEach(c => visit(c.to));
    visiting.delete(id);
    visited.add(id);
  };
  nodes.forEach(n => visit(n.id));
  return cyclic;
}

function auditCompleteness(nodes: PipelineNode[], issues: ComplianceIssue[]): number {
  if (nodes.length === 0) return 0;
  let checks = 0;
  let passed = 0;

  nodes.forEach(node => {
    checks++;
    if (node.description && node.description.trim().length > 0) passed++;
    else issues.push({ dimension: 'completeness', severity: 'warning', message: `Node "${node.name}" has no description.`, nodeId: node.id });

    if (node.type === 'source') {
      checks += 2;
      if (node.system) passed++;
      else issues.push({ dimension: 'completeness', severity: 'warning', message: `Source "${node.name}" has no system defined.`, nodeId: node.id });
      if (node.location) passed++;
      else issues.push({ dimension: 'completeness', severity: 'warning', message: `Source "${node.name}" has no location defined.`, nodeId: node.id });
    }

    if (node.type === 'destination') {
      checks++;
      if (node.location) passed++;
      else issues.push({ dimension: 'completeness', severity: 'warning', message: `Destination "${node.name}" has no location defined.`, nodeId: node.id });
    }

    if (node.type === 'transformation') {
      checks++;
      if (node.operation && node.operation.type !== 'no_op') passed++;
      else issues.push({ dimension: 'completeness', severity: 'critical', message: `Transformation "${node.name}" has no operation configured.`, nodeId: node.id });
    }

    const fields = [...(node.inputFields || []), ...(node.outputFields || [])];
    fields.forEach(f => {
      checks++;
      if (f.type && f.type.trim().length > 0) passed++;
      else issues.push({ dimension: 'completeness', severity: 'info', message: `Field "${f.name}" on "${node.name}" has no type.`, nodeId: node.id });
    });
  });

  return clamp(ratio(passed, checks));
}

function auditCoherence(nodes: PipelineNode[], connectors: Connector[], issues: ComplianceIssue[]): number {
  if (nodes.length === 0) return 0;
  let checks = 0;
  let passed = 0;

  const nodeIds = new Set(nodes.map(n => n.id));
  connectors.forEach(c => {
    checks++;
    if (nodeIds.has(c.from) && nodeIds.has(c.to)) passed++;
    else issues.push({ dimension: 'coherence', severity: 'critical', message: `Connector references a missing node (${c.from} -> ${c.to}).` });
  });

  if (nodes.length > 1) {
    nodes.forEach(node => {
      checks++;
      const isConnected = connectors.some(c => c.from === node.id || c.to === node.id);
      if (isConnected) passed++;
      else issues.push({ dimension: 'coherence', severity: 'warning', message: `Node "${node.name}" is not connected to the rest of the pipeline.`, nodeId: node.id });
    });
  }

  nodes.filter(n => n.operation?.type === 'join' || n.operation?.type === 'union').forEach(node => {
    checks++;
    const parentCount = connectors.filter(c => c.to === node.id).length;
    if (parentCount >= 2) passed++;
    else issues.push({ dimension: 'coherence', severity: 'critical', message: `"${node.name}" (${node.operation!.type}) requires at least 2 inputs, has ${parentCount}.`, nodeId: node.id });
  });

  checks++;
  if (hasCycle(nodes, connectors)) {
    issues.push({ dimension: 'coherence', severity: 'critical', message: 'The pipeline graph contains a cycle.' });
  } else {
    passed++;
  }

  return clamp(ratio(passed, checks));
}

function auditQuality(nodes: PipelineNode[], issues: ComplianceIssue[]): number {
  const sources = nodes.filter(n => n.type === 'source');
  let checks = 0;
  let passed = 0;

  const hasQualityOp = nodes.some(n => n.operation && (QUALITY_OPERATION_TYPES.has(n.operation.type) ||
    (n.operation.type === 'sql_pattern' && ['dedup_by_key', 'row_quality_tests', 'soft_delete_filter'].includes(n.operation.settings?.patternId))));
  checks++;
  if (hasQualityOp) passed++;
  else issues.push({ dimension: 'quality', severity: 'info', message: 'No data quality transformation (dedup, missing-value handling, quality control...) found in the pipeline.' });

  sources.forEach(s => {
    checks++;
    if (s.qualityMetrics && (s.qualityMetrics.completeness !== undefined || s.qualityMetrics.freshness || s.qualityMetrics.validity !== undefined)) {
      passed++;
    } else {
      issues.push({ dimension: 'quality', severity: 'info', message: `Source "${s.name}" has no data quality metrics documented.`, nodeId: s.id });
    }
  });

  return clamp(ratio(passed, checks));
}

function auditMaintainability(nodes: PipelineNode[], issues: ComplianceIssue[]): number {
  if (nodes.length === 0) return 0;
  let checks = 0;
  let passed = 0;

  const nameCounts = new Map<string, number>();
  nodes.forEach(n => nameCounts.set(n.name, (nameCounts.get(n.name) || 0) + 1));

  nodes.forEach(node => {
    checks++;
    if (GENERIC_NAME_PATTERN.test(node.name.trim())) {
      issues.push({ dimension: 'maintainability', severity: 'warning', message: `Node "${node.name}" uses a generic, non-descriptive name.`, nodeId: node.id });
    } else {
      passed++;
    }

    checks++;
    if ((nameCounts.get(node.name) || 0) > 1) {
      issues.push({ dimension: 'maintainability', severity: 'warning', message: `Node name "${node.name}" is used more than once.`, nodeId: node.id });
    } else {
      passed++;
    }

    checks++;
    if (node.groupId) passed++;
    else issues.push({ dimension: 'maintainability', severity: 'info', message: `Node "${node.name}" doesn't belong to any group.`, nodeId: node.id });
  });

  return clamp(ratio(passed, checks));
}

function auditSecurity(nodes: PipelineNode[], connectors: Connector[], issues: ComplianceIssue[]): number {
  const destinationIds = new Set(nodes.filter(n => n.type === 'destination').map(n => n.id));
  const reachesDestination = (nodeId: string, seen = new Set<string>()): boolean => {
    if (seen.has(nodeId)) return false;
    seen.add(nodeId);
    if (destinationIds.has(nodeId)) return true;
    return connectors.filter(c => c.from === nodeId).some(c => reachesDestination(c.to, seen));
  };

  let checks = 0;
  let passed = 0;

  nodes.forEach(node => {
    (node.outputFields || []).forEach(field => {
      if (!PII_FIELD_PATTERN.test(field.name)) return;
      checks++;
      if (field.classification === 'pii' || field.classification === 'confidential') {
        passed++;
      } else if (reachesDestination(node.id)) {
        issues.push({ dimension: 'security', severity: 'critical', message: `Field "${field.name}" on "${node.name}" looks like PII, reaches a destination, and isn't classified.`, nodeId: node.id });
      } else {
        issues.push({ dimension: 'security', severity: 'warning', message: `Field "${field.name}" on "${node.name}" looks like PII and isn't classified.`, nodeId: node.id });
      }
    });
  });

  return clamp(ratio(passed, checks));
}

export function computeComplianceAudit(nodes: PipelineNode[], connectors: Connector[]): ComplianceAuditResult {
  const issues: ComplianceIssue[] = [];

  const scores: Record<ComplianceDimensionKey, number> = {
    completeness: auditCompleteness(nodes, issues),
    coherence: auditCoherence(nodes, connectors, issues),
    quality: auditQuality(nodes, issues),
    maintainability: auditMaintainability(nodes, issues),
    security: auditSecurity(nodes, connectors, issues),
  };

  const dimensions: ComplianceDimensionResult[] = (Object.keys(scores) as ComplianceDimensionKey[]).map(key => ({
    key,
    label: COMPLIANCE_DIMENSION_LABELS[key],
    weight: COMPLIANCE_DIMENSION_WEIGHTS[key],
    score: scores[key],
  }));

  const globalScore = clamp(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0)
  );

  return {
    score: globalScore,
    grade: scoreToGrade(globalScore),
    dimensions,
    issues,
  };
}
