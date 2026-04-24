import { computed, Signal } from '@angular/core';

/**
 * Creates a computed signal that transforms each element of an array signal.
 *
 * @example
 * ```typescript
 * const items = signal([1, 2, 3]);
 * const doubled = computedMap(items, x => x * 2);
 * console.log(doubled()); // [2, 4, 6]
 * ```
 */
export function computedMap<T, U>(
  source: Signal<T[]>,
  mapFn: (item: T, index: number) => U
) {
  return computed(() => source().map((item, index) => mapFn(item, index)));
}
