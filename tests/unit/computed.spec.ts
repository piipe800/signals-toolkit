import { signal } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { computedMap, computedFilter, computedReduce } from '../../src/lib/computed';

describe('Computed Utilities', () => {
  describe('computedMap', () => {
    it('should transform array elements', () => {
      const items = signal([1, 2, 3]);
      const doubled = computedMap(items, x => x * 2);

      expect(doubled()).toEqual([2, 4, 6]);
    });

    it('should react to signal changes', () => {
      const items = signal([1, 2, 3]);
      const doubled = computedMap(items, x => x * 2);

      items.set([4, 5, 6]);
      expect(doubled()).toEqual([8, 10, 12]);
    });

    it('should handle empty arrays', () => {
      const items = signal<number[]>([]);
      const doubled = computedMap(items, x => x * 2);

      expect(doubled()).toEqual([]);
    });

    it('should pass index to mapFn', () => {
      const items = signal(['a', 'b', 'c']);
      const indexed = computedMap(items, (item, i) => `${i}:${item}`);

      expect(indexed()).toEqual(['0:a', '1:b', '2:c']);
    });
  });

  describe('computedFilter', () => {
    it('should filter array based on predicate', () => {
      const items = signal([1, 2, 3, 4, 5]);
      const evens = computedFilter(items, x => x % 2 === 0);

      expect(evens()).toEqual([2, 4]);
    });

    it('should react to signal changes', () => {
      const items = signal([1, 2, 3]);
      const gt2 = computedFilter(items, x => x > 2);

      expect(gt2()).toEqual([3]);

      items.set([5, 6, 7]);
      expect(gt2()).toEqual([5, 6, 7]);
    });

    it('should return empty array when no items match', () => {
      const items = signal([1, 2, 3]);
      const none = computedFilter(items, x => x > 10);

      expect(none()).toEqual([]);
    });
  });

  describe('computedReduce', () => {
    it('should reduce array to single value', () => {
      const items = signal([1, 2, 3, 4]);
      const sum = computedReduce(items, (acc, val) => acc + val, 0);

      expect(sum()).toBe(10);
    });

    it('should work with different types', () => {
      const items = signal(['a', 'b', 'c']);
      const concatenated = computedReduce(items, (acc, val) => acc + val, '');

      expect(concatenated()).toBe('abc');
    });

    it('should return initialValue for empty array', () => {
      const items = signal<number[]>([]);
      const sum = computedReduce(items, (acc, val) => acc + val, 0);

      expect(sum()).toBe(0);
    });
  });
});
