// Simple test for pipeline data model
import { transformations, advancedTransformations } from '../pipeline-data';
import type { TransformationItem, TransformationCategory } from '../pipeline-data';

// Helper to check if an object has the required properties of a TransformationItem
function isTransformationItem(obj: any): obj is TransformationItem {
  return (
    typeof obj.name === 'string' &&
    typeof obj.icon === 'object' && // Icon is a React component, we'll just check it's an object
    typeof obj.type === 'string' &&
    (obj.operationType === undefined || typeof obj.operationType === 'string') &&
    (obj.description === undefined || typeof obj.description === 'string')
  );
}

// Helper to check if an object has the required properties of a TransformationCategory
function isTransformationCategory(obj: any): obj is TransformationCategory {
  return (
    typeof obj.category === 'string' &&
    Array.isArray(obj.items) &&
    obj.items.every(isTransformationItem)
  );
}

describe('Pipeline Data Model', () => {
  test('transformations object has expected structure', () => {
    expect(transformations).toHaveProperty('sources');
    expect(transformations).toHaveProperty('dataset');
    expect(transformations).toHaveProperty('destination');
    expect(transformations).toHaveProperty('common');

    expect(Array.isArray(transformations.sources)).toBe(true);
    expect(typeof transformations.dataset).toBe('object');
    expect(typeof transformations.destination).toBe('object');
    expect(Array.isArray(transformations.common)).toBe(true);

    // Check each item in sources
    transformations.sources.forEach(item => {
      expect(isTransformationItem(item)).toBe(true);
      expect(item.type).toBe('source');
    });

    // Check dataset
    expect(isTransformationItem(transformations.dataset)).toBe(true);
    expect(transformations.dataset.type).toBe('dataset');

    // Check destination
    expect(isTransformationItem(transformations.destination)).toBe(true);
    expect(transformations.destination.type).toBe('destination');

    // Check each item in common
    transformations.common.forEach(item => {
      expect(isTransformationItem(item)).toBe(true);
      expect(item.type).toBe('transformation');
    });
  });

  test('advancedTransformations array has expected structure', () => {
    expect(Array.isArray(advancedTransformations)).toBe(true);
    advancedTransformations.forEach(category => {
      expect(isTransformationCategory(category)).toBe(true);
      category.items.forEach(item => {
        expect(isTransformationItem(item)).toBe(true);
        expect(item.type).toBe('transformation');
      });
    });
  });
});