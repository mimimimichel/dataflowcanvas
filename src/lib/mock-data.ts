// Mock datasets for pipeline preview — realistic Foundry-style data

export interface MockRow {
  [key: string]: string | number | boolean | null;
}

export interface MockDataset {
  columns: { name: string; type: string }[];
  rows: MockRow[];
  rowCount: number; // total rows (simulated)
}

export const mockCustomerDB: MockDataset = {
  columns: [
    { name: 'id', type: 'integer' },
    { name: 'first_name', type: 'string' },
    { name: 'last_name', type: 'string' },
    { name: 'email', type: 'string' },
    { name: 'is_active', type: 'boolean' },
  ],
  rowCount: 145_230,
  rows: [
    { id: 1, first_name: 'Marie', last_name: 'Dubois', email: 'marie.dubois@email.com', is_active: true },
    { id: 2, first_name: 'Pierre', last_name: 'Martin', email: 'pierre.martin@email.com', is_active: true },
    { id: 3, first_name: 'Sophie', last_name: 'Bernard', email: 'sophie.b@email.com', is_active: false },
    { id: 4, first_name: 'Jean', last_name: 'Petit', email: 'jean.petit@email.com', is_active: true },
    { id: 5, first_name: 'Claire', last_name: 'Leroy', email: 'claire.leroy@email.com', is_active: false },
    { id: 6, first_name: 'Luc', last_name: 'Moreau', email: 'luc.moreau@email.com', is_active: true },
    { id: 7, first_name: 'Anne', last_name: 'Simon', email: null, is_active: true },
    { id: 8, first_name: 'Marc', last_name: 'Laurent', email: 'marc.laurent@email.com', is_active: true },
    { id: 9, first_name: 'Julie', last_name: 'Michel', email: 'julie.michel@email.com', is_active: false },
    { id: 10, first_name: 'Thomas', last_name: 'Garcia', email: 'thomas.garcia@email.com', is_active: true },
  ],
};

export const mockOrdersDB: MockDataset = {
  columns: [
    { name: 'order_id', type: 'integer' },
    { name: 'customer_id', type: 'integer' },
    { name: 'amount', type: 'float' },
    { name: 'order_date', type: 'date' },
  ],
  rowCount: 523_891,
  rows: [
    { order_id: 1001, customer_id: 1, amount: 245.50, order_date: '2026-03-15' },
    { order_id: 1002, customer_id: 1, amount: 89.99, order_date: '2026-03-18' },
    { order_id: 1003, customer_id: 2, amount: 1_340.00, order_date: '2026-03-20' },
    { order_id: 1004, customer_id: 4, amount: 67.25, order_date: '2026-03-22' },
    { order_id: 1005, customer_id: 6, amount: 523.00, order_date: '2026-03-25' },
    { order_id: 1006, customer_id: 8, amount: 199.99, order_date: '2026-04-01' },
    { order_id: 1007, customer_id: 10, amount: null, order_date: '2026-04-02' },
    { order_id: 1008, customer_id: 2, amount: 450.00, order_date: '2026-04-03' },
  ],
};

export const mockFlightOps: MockDataset = {
  columns: [
    { name: 'flight_id', type: 'string' },
    { name: 'origin', type: 'string' },
    { name: 'destination', type: 'string' },
    { name: 'scheduled_dep', type: 'timestamp' },
    { name: 'actual_dep', type: 'timestamp' },
    { name: 'delay_minutes', type: 'integer' },
    { name: 'aircraft', type: 'string' },
  ],
  rowCount: 89_452,
  rows: [
    { flight_id: 'AF1234', origin: 'CDG', destination: 'JFK', scheduled_dep: '2026-04-06 08:00', actual_dep: '2026-04-06 08:45', delay_minutes: 45, aircraft: 'A350-900' },
    { flight_id: 'AF0078', origin: 'CDG', destination: 'LAX', scheduled_dep: '2026-04-06 10:30', actual_dep: '2026-04-06 10:30', delay_minutes: 0, aircraft: 'B777-300' },
    { flight_id: 'BA0302', origin: 'LHR', destination: 'CDG', scheduled_dep: '2026-04-06 07:15', actual_dep: '2026-04-06 07:52', delay_minutes: 37, aircraft: 'A320neo' },
    { flight_id: 'LH1034', origin: 'FRA', destination: 'ORY', scheduled_dep: '2026-04-06 12:00', actual_dep: '2026-04-06 12:10', delay_minutes: 10, aircraft: 'A321neo' },
    { flight_id: 'AF7890', origin: 'CDG', destination: 'SFO', scheduled_dep: '2026-04-06 14:00', actual_dep: null, delay_minutes: null, aircraft: 'B787-9' },
    { flight_id: 'U21523', origin: 'ORY', destination: 'FCO', scheduled_dep: '2026-04-06 09:45', actual_dep: '2026-04-06 09:45', delay_minutes: 0, aircraft: 'A320' },
    { flight_id: 'AF6612', origin: 'CDG', destination: 'MIA', scheduled_dep: '2026-04-06 11:20', actual_dep: '2026-04-06 12:05', delay_minutes: 45, aircraft: 'A330-200' },
  ],
};

export const mockMaintenanceData: MockDataset = {
  columns: [
    { name: 'asset_id', type: 'string' },
    { name: 'component', type: 'string' },
    { name: 'sensor_reading', type: 'float' },
    { name: 'temperature_c', type: 'float' },
    { name: 'vibration_level', type: 'float' },
    { name: 'maintenance_due', type: 'boolean' },
    { name: 'last_maintenance', type: 'date' },
  ],
  rowCount: 2_340_000,
  rows: [
    { asset_id: 'ENG-0042', component: 'Turbine Blade', sensor_reading: 98.7, temperature_c: 845.2, vibration_level: 2.3, maintenance_due: false, last_maintenance: '2026-01-15' },
    { asset_id: 'ENG-0043', component: 'Turbine Blade', sensor_reading: 102.1, temperature_c: 867.8, vibration_level: 4.7, maintenance_due: true, last_maintenance: '2025-11-20' },
    { asset_id: 'PUMP-0201', component: 'Hydraulic Pump', sensor_reading: 45.3, temperature_c: 62.1, vibration_level: 1.1, maintenance_due: false, last_maintenance: '2026-03-01' },
    { asset_id: 'PUMP-0202', component: 'Hydraulic Pump', sensor_reading: 51.8, temperature_c: 78.4, vibration_level: 3.9, maintenance_due: true, last_maintenance: '2025-12-10' },
    { asset_id: 'MTR-1100', component: 'Electric Motor', sensor_reading: null, temperature_c: 55.0, vibration_level: 0.8, maintenance_due: false, last_maintenance: '2026-02-20' },
    { asset_id: 'ENG-0044', component: 'Combustion Chamber', sensor_reading: 110.5, temperature_c: 920.3, vibration_level: 5.2, maintenance_due: true, last_maintenance: '2025-10-05' },
  ],
};

export const mockSupplyChain: MockDataset = {
  columns: [
    { name: 'shipment_id', type: 'string' },
    { name: 'warehouse', type: 'string' },
    { name: 'destination', type: 'string' },
    { name: 'items_count', type: 'integer' },
    { name: 'weight_kg', type: 'float' },
    { name: 'status', type: 'string' },
    { name: 'eta', type: 'date' },
  ],
  rowCount: 67_891,
  rows: [
    { shipment_id: 'SHP-001234', warehouse: 'CDG-WH1', destination: 'Lyon Hub', items_count: 342, weight_kg: 2_840.5, status: 'in_transit', eta: '2026-04-07' },
    { shipment_id: 'SHP-001235', warehouse: 'CDG-WH1', destination: 'Marseille Hub', items_count: 128, weight_kg: 950.0, status: 'pending', eta: '2026-04-08' },
    { shipment_id: 'SHP-001236', warehouse: 'ORY-WH2', destination: 'Toulouse Hub', items_count: 567, weight_kg: 4_200.3, status: 'in_transit', eta: '2026-04-07' },
    { shipment_id: 'SHP-001237', warehouse: 'CDG-WH1', destination: 'Bordeaux Hub', items_count: 89, weight_kg: 620.0, status: 'delivered', eta: '2026-04-05' },
    { shipment_id: 'SHP-001238', warehouse: 'ORY-WH2', destination: 'Lille Hub', items_count: null, weight_kg: 1_100.0, status: 'pending', eta: '2026-04-09' },
  ],
};

// Map source names to mock datasets
export function getMockDataForNode(nodeName: string, nodeType: string): MockDataset | null {
  const name = nodeName.toLowerCase();

  // Match by keyword
  if (nodeType === 'source') {
    if (name.includes('customer') || name.includes('client') || name.includes('contact')) return mockCustomerDB;
    if (name.includes('order') || name.includes('commande') || name.includes('purchase') || name.includes('transaction')) return mockOrdersDB;
    if (name.includes('flight') || name.includes('vol') || name.includes('aircraft') || name.includes('departure') || name.includes('delay')) return mockFlightOps;
    if (name.includes('maintenance') || name.includes('sensor') || name.includes('asset') || name.includes('engine') || name.includes('pump')) return mockMaintenanceData;
    if (name.includes('supply') || name.includes('shipment') || name.includes('warehouse') || name.includes('inventory') || name.includes('物流')) return mockSupplyChain;
    // No mock dataset matches this source's name — better to show nothing than to
    // silently pass off an unrelated dataset (e.g. customer records) as this node's
    // sample data.
    return null;
  }

  // For transformations/destinations — data comes from upstream (executor handles this)
  return null;
}
