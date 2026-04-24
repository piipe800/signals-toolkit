import { signal, WritableSignal } from '@angular/core';
import type { DebounceOptions } from '../../types';

/**
 * Creates a WritableSignal whose value updates are debounced.
 * Calls to .set() are delayed by the specified duration.
 * Only the last call within the delay window takes effect.
 *
 * @example
 * ```typescript
 * const search = debounceSignal('', 500);
 * search.set(inputValue); // Only applies after 500ms of inactivity
 *
 * effect(() => fetchResults(search())); // Fires at most once per 500ms
 * ```
 */
export function debounceSignal<T>(
  initialValue: T,
  delayMsOrOptions: number | DebounceOptions
): WritableSignal<T> {
  const opts: Required<DebounceOptions> =
    typeof delayMsOrOptions === 'number'
      ? { delay: delayMsOrOptions, trailing: true, leading: false }
      : { trailing: true, leading: false, ...delayMsOrOptions };

  const state = signal<T>(initialValue);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let isLeadingWindow = true;

  function applyDebounce(value: T): void {
    if (opts.leading && isLeadingWindow) {
      isLeadingWindow = false;
      state.set(value);
    }

    if (timer !== null) clearTimeout(timer);

    timer = setTimeout(() => {
      timer = null;
      isLeadingWindow = true;
      if (opts.trailing) state.set(value);
    }, opts.delay);
  }

  function readFn(): T { return state(); }
  (readFn as unknown as WritableSignal<T>).set = (value: T): void => applyDebounce(value);
  (readFn as unknown as WritableSignal<T>).update = (fn: (v: T) => T): void =>
    applyDebounce(fn(state()));
  (readFn as unknown as WritableSignal<T>).asReadonly = () => state.asReadonly();

  return readFn as unknown as WritableSignal<T>;
}
