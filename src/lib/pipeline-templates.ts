/**
 * Pipeline Templates — pre-built Foundry pipeline blueprints
 * Based on real Skywise / aerospace data patterns
 */
import type { PipelineNode, Connector, Field, Operation } from '@/lib/pipeline-data';

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'flight-ops' | 'maintenance' | 'supply-chain' | 'data-ingestion' | 'quality';
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  nodes: PipelineNode[];
  connectors: Connector[];
}

function n(id: string, name: string, type: 'source' | 'transformation' | 'destination', fields: Field[], x: number, y: number, op?: Operation): PipelineNode {
  return { id, name, type, position: { x, y }, outputFields: fields, ...(op && { operation: op }) };
}

function c(from: string, to: string): Connector {
  return { from, to };
}

const flightFields: Field[] = [
  { name: 'flight_id', type: 'string' }, { name: 'aircraft_id', type: 'string' },
  { name: 'departure_airport', type: 'string' }, { name: 'arrival_airport', type: 'string' },
  { name: 'scheduled_departure', type: 'timestamp' }, { name: 'actual_departure', type: 'timestamp' },
  { name: 'flight_status', type: 'string' }, { name: 'delay_minutes', type: 'integer' },
];

const weatherFields: Field[] = [
  { name: 'airport_code', type: 'string' }, { name: 'timestamp', type: 'timestamp' },
  { name: 'temperature', type: 'number' }, { name: 'wind_speed', type: 'number' },
  { name: 'visibility', type: 'number' }, { name: 'precipitation', type: 'number' },
];

const maintenanceFields: Field[] = [
  { name: 'maintenance_id', type: 'string' }, { name: 'aircraft_id', type: 'string' },
  { name: 'component_id', type: 'string' }, { name: 'part_number', type: 'string' },
  { name: 'maintenance_type', type: 'string' }, { name: 'completion_date', type: 'date' },
  { name: 'cost', type: 'number' }, { name: 'downtime_hours', type: 'number' },
];

const sensorFields: Field[] = [
  { name: 'sensor_id', type: 'string' }, { name: 'aircraft_id', type: 'string' },
  { name: 'timestamp', type: 'timestamp' }, { name: 'engine_temp', type: 'number' },
  { name: 'vibration', type: 'number' }, { name: 'pressure', type: 'number' },
  { name: 'rpm', type: 'integer' }, { name: 'fuel_flow', type: 'number' },
];

export const templateFlightDelay: PipelineTemplate = {
  id: 'flight-delay-analysis', name: 'Skywise Flight Delay Analysis',
  description: 'Join flight data + weather, filter commercial flights, group by route, identify patterns.',
  icon: '✈️', category: 'flight-ops', tags: ['flights', 'delays', 'weather'], difficulty: 'intermediate',
  nodes: [
    n('fd1', 'Flight Data', 'source', flightFields, 50, 100),
    n('fd2', 'Weather Data', 'source', weatherFields, 50, 380),
    n('fd3', 'Filter Commercial', 'transformation', flightFields, 330, 100,
      { type: 'filter', settings: { field: 'flight_status', operator: '==', value: "'COMMERCIAL'" } }),
    n('fd4', 'Handle Missing', 'transformation', weatherFields, 330, 380,
      { type: 'handle_missing_values', settings: { strategy: 'drop_na' } }),
    n('fd5', 'Join × Weather', 'transformation', [...flightFields], 630, 240,
      { type: 'join', settings: { leftNodeId: 'fd3', rightNodeId: 'fd4', joinType: 'inner', condition: { leftField: 'arrival_airport', rightField: 'airport_code' } } }),
    n('fd6', 'Group By Route', 'transformation', [{ name: 'route', type: 'string' }, { name: 'avg_delay', type: 'number' }], 930, 240,
      { type: 'group_by', settings: { groupByFields: ['departure_airport', 'arrival_airport'] } }),
    n('fd7', 'Delay Analysis Output', 'destination', [{ name: 'route', type: 'string' }, { name: 'avg_delay', type: 'number' }], 1180, 240),
  ],
  connectors: [c('fd1', 'fd3'), c('fd2', 'fd4'), c('fd3', 'fd5'), c('fd4', 'fd5'), c('fd5', 'fd6'), c('fd6', 'fd7')],
};

export const templatePredictiveMaintenance: PipelineTemplate = {
  id: 'predictive-maintenance', name: 'Predictive Maintenance',
  description: 'Sensor data → dedup → join with maintenance records → identify anomalies before failures.',
  icon: '🔧', category: 'maintenance', tags: ['sensors', 'predictive', 'iot'], difficulty: 'advanced',
  nodes: [
    n('pm1', 'Engine Sensors', 'source', sensorFields, 50, 80),
    n('pm2', 'Maintenance Records', 'source', maintenanceFields, 50, 360),
    n('pm3', 'Dedup Sensors', 'transformation', sensorFields, 330, 80, { type: 'deduplication', settings: { keys: ['sensor_id', 'aircraft_id'] } }),
    n('pm4', 'Filter Active', 'transformation', maintenanceFields, 330, 360,
      { type: 'filter', settings: { field: 'maintenance_type', operator: '!=', value: "'DISMANTLED'" } }),
    n('pm5', 'Join Sensors×Maint', 'transformation', [...sensorFields], 630, 220,
      { type: 'join', settings: { leftNodeId: 'pm3', rightNodeId: 'pm4', joinType: 'left', condition: { leftField: 'aircraft_id', rightField: 'aircraft_id' } } }),
    n('pm6', 'High Temp Alert', 'transformation', sensorFields, 900, 220,
      { type: 'filter', settings: { field: 'engine_temp', operator: '>', value: '950' } }),
    n('pm7', 'Anomaly Output', 'destination', [{ name: 'aircraft_id', type: 'string' }, { name: 'anomaly_count', type: 'integer' }], 1150, 220),
  ],
  connectors: [c('pm1', 'pm3'), c('pm2', 'pm4'), c('pm3', 'pm5'), c('pm4', 'pm5'), c('pm5', 'pm6'), c('pm6', 'pm7')],
};

export const templateSupplyChain: PipelineTemplate = {
  id: 'supply-chain-tracking', name: 'Supply Chain Tracking',
  description: 'Parts inventory → low stock filter → join with supplier data → identify critical shortages.',
  icon: '📦', category: 'supply-chain', tags: ['supply', 'inventory', 'parts'], difficulty: 'beginner',
  nodes: [
    n('sc1', 'Parts Inventory', 'source',
      [{ name: 'part_id', type: 'string' }, { name: 'part_number', type: 'string' }, { name: 'quantity', type: 'integer' }, { name: 'supplier_id', type: 'string' }, { name: 'warehouse', type: 'string' }], 50, 150),
    n('sc2', 'Supplier Data', 'source',
      [{ name: 'supplier_id', type: 'string' }, { name: 'supplier_name', type: 'string' }, { name: 'avg_lead_time', type: 'number' }, { name: 'reliability_score', type: 'number' }], 50, 430),
    n('sc3', 'Low Stock <100', 'transformation',
      [{ name: 'part_id', type: 'string' }, { name: 'quantity', type: 'integer' }, { name: 'supplier_id', type: 'string' }], 330, 150,
      { type: 'filter', settings: { field: 'quantity', operator: '<', value: '100' } }),
    n('sc4', 'Join Parts×Supplier', 'transformation',
      [{ name: 'part_id', type: 'string' }, { name: 'quantity', type: 'integer' }, { name: 'supplier_name', type: 'string' }, { name: 'reliability_score', type: 'number' }], 630, 290,
      { type: 'join', settings: { leftNodeId: 'sc3', rightNodeId: 'sc2', joinType: 'inner', condition: { leftField: 'supplier_id', rightField: 'supplier_id' } } }),
    n('sc5', 'Critical Parts', 'destination',
      [{ name: 'part_id', type: 'string' }, { name: 'supplier_name', type: 'string' }, { name: 'quantity', type: 'integer' }], 930, 290),
  ],
  connectors: [c('sc1', 'sc3'), c('sc2', 'sc4'), c('sc3', 'sc4'), c('sc4', 'sc5')],
};

export const templateETLPipeline: PipelineTemplate = {
  id: 'etl-pipeline-basic', name: 'Basic ETL Pipeline',
  description: 'Standard ETL: raw → clean nulls → dedup → filter → output. The Foundry workhorse.',
  icon: '🔄', category: 'data-ingestion', tags: ['etl', 'clean'], difficulty: 'beginner',
  nodes: [
    n('et1', 'Raw Data', 'source',
      [{ name: 'raw_id', type: 'string' }, { name: 'raw_value', type: 'number' }, { name: 'raw_status', type: 'string' }, { name: 'raw_date', type: 'date' }], 50, 200),
    n('et2', 'Handle Nulls', 'transformation',
      [{ name: 'raw_id', type: 'string' }, { name: 'raw_value', type: 'number' }, { name: 'raw_status', type: 'string' }], 330, 200,
      { type: 'handle_missing_values', settings: { strategy: 'fill', fillValues: { raw_status: "'UNKNOWN'" } } }),
    n('et3', 'Dedup', 'transformation',
      [{ name: 'raw_id', type: 'string' }, { name: 'raw_value', type: 'number' }], 580, 200,
      { type: 'deduplication', settings: { keys: ['raw_id'] } }),
    n('et4', 'Filter Active', 'transformation',
      [{ name: 'raw_id', type: 'string' }, { name: 'raw_value', type: 'number' }], 830, 200,
      { type: 'filter', settings: { field: 'raw_status', operator: '==', value: "'ACTIVE'" } }),
    n('et5', 'Clean Output', 'destination',
      [{ name: 'raw_id', type: 'string' }, { name: 'raw_value', type: 'number' }], 1080, 200),
  ],
  connectors: [c('et1', 'et2'), c('et2', 'et3'), c('et3', 'et4'), c('et4', 'et5')],
};

export const templateDataQuality: PipelineTemplate = {
  id: 'data-quality-check', name: 'Data Quality Pipeline',
  description: 'Null rate check → range validation → group by category → quality report.',
  icon: '✅', category: 'quality', tags: ['quality', 'validation'], difficulty: 'intermediate',
  nodes: [
    n('dq1', 'Input Dataset', 'source',
      [{ name: 'id', type: 'string' }, { name: 'value', type: 'number' }, { name: 'category', type: 'string' }, { name: 'created_date', type: 'date' }], 50, 200),
    n('dq2', 'Null Check', 'transformation',
      [{ name: 'id', type: 'string' }, { name: 'value', type: 'number' }, { name: 'category', type: 'string' }], 350, 100,
      { type: 'handle_missing_values', settings: { strategy: 'null_count' } }),
    n('dq3', 'Range ≥0', 'transformation',
      [{ name: 'id', type: 'string' }, { name: 'value', type: 'number' }, { name: 'category', type: 'string' }], 350, 300,
      { type: 'filter', settings: { field: 'value', operator: '>=', value: '0' } }),
    n('dq4', 'Group Report', 'transformation',
      [{ name: 'category', type: 'string' }, { name: 'record_count', type: 'integer' }, { name: 'valid_count', type: 'integer' }], 650, 200,
      { type: 'group_by', settings: { groupByFields: ['category'] } }),
    n('dq5', 'Quality Report', 'destination',
      [{ name: 'category', type: 'string' }, { name: 'valid_pct', type: 'number' }, { name: 'total', type: 'integer' }], 900, 200),
  ],
  connectors: [c('dq1', 'dq2'), c('dq1', 'dq3'), c('dq2', 'dq4'), c('dq3', 'dq4'), c('dq4', 'dq5')],
};

export const ALL_TEMPLATES: PipelineTemplate[] = [
  templateFlightDelay, templatePredictiveMaintenance, templateSupplyChain, templateETLPipeline, templateDataQuality,
];

export const TEMPLATE_CATEGORIES: { id: PipelineTemplate['category']; label: string; icon: string }[] = [
  { id: 'flight-ops', label: 'Flight Ops', icon: '✈️' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
  { id: 'supply-chain', label: 'Supply Chain', icon: '📦' },
  { id: 'data-ingestion', label: 'Data Ingestion', icon: '🔄' },
  { id: 'quality', label: 'Quality', icon: '✅' },
];
