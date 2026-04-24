import { computed, Signal } from '@angular/core';

/**
 * Creates a computed Signal that only propagates changes when the value
 * actually differs from the previous value.
 * Uses strict equality by default; accepts a custom equality function.
 *
 * @example
 * ```typescript
 * const raw = signal({ id: 1, name: 'test' });
 * const distinct = distinctUntilChanged(raw, (a, b) => a.id === b.id);
 * // Downstream only recomputes when id changes, ignoring other field changes
 * ```
 */
export function distinctUntilChanged<T>(
  source: Signal<T>,
  equalityFn: (a: T, b: T) => boolean = (a, b) => a === b
): Signal<T> {
  let prev: T = source();

  return computed(() => {
    const curr = source();
    if (!equalityFn(prev, curr)) {
      prev = curr;
    }
    return prev;
  });
}
