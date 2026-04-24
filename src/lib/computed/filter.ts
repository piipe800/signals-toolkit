import { computed, Signal } from '@angular/core';

/**
 * Creates a computed signal that filters elements based on a predicate.
 *
 * @example
 * ```typescript
 * const todos = signal([{ id: 1, done: true }, { id: 2, done: false }]);
 * const completed = computedFilter(todos, t => t.done);
 * console.log(completed()); // [{ id: 1, done: true }]
 * ```
 */
export function computedFilter<T>(
  source: Signal<T[]>,
  predicateFn: (item: T, index: number) => boolean
) {
  return computed(() => source().filter((item, index) => predicateFn(item, index)));
}
