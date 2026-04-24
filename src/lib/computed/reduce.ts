import { computed, Signal } from '@angular/core';

/**
 * Creates a computed signal that reduces an array to a single value.
 *
 * @example
 * ```typescript
 * const items = signal([1, 2, 3, 4]);
 * const sum = computedReduce(items, (acc, val) => acc + val, 0);
 * console.log(sum()); // 10
 * ```
 */
export function computedReduce<T, U>(
  source: Signal<T[]>,
  reduceFn: (accumulator: U, current: T, index: number) => U,
  initialValue: U
) {
  return computed(() =>
    source().reduce((acc, item, index) => reduceFn(acc, item, index), initialValue)
  );
}
