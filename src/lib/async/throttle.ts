import { signal, WritableSignal } from '@angular/core';
import type { ThrottleOptions } from '../../types';

/**
 * Creates a WritableSignal whose value updates are throttled.
 * Emits on the leading edge and optionally on the trailing edge.
 *
 * @example
 * ```typescript
 * const scrollY = throttleSignal(0, 100);
 * window.addEventListener('scroll', () => scrollY.set(window.scrollY));
 * // Signal updates at most once every 100ms
 * ```
 */
export function throttleSignal<T>(
  initialValue: T,
  delayMsOrOptions: number | ThrottleOptions
): WritableSignal<T> {
  const opts: Required<ThrottleOptions> =
    typeof delayMsOrOptions === 'number'
      ? { delay: delayMsOrOptions, trailing: true, leading: true }
      : { trailing: true, leading: true, ...delayMsOrOptions };

  const state = signal<T>(initialValue);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latestValue: T = initialValue;
  let canLeadEmit = true;

  function applyThrottle(value: T): void {
    latestValue = value;

    if (canLeadEmit && opts.leading) {
      canLeadEmit = false;
      state.set(value);

      timer = setTimeout(() => {
        timer = null;
        canLeadEmit = true;
        if (opts.trailing) state.set(latestValue);
      }, opts.delay);
      return;
    }

    if (timer === null && !opts.leading && opts.trailing) {
      timer = setTimeout(() => {
        timer = null;
        canLeadEmit = true;
        state.set(latestValue);
      }, opts.delay);
    }
  }

  function readFn(): T { return state(); }
  (readFn as unknown as WritableSignal<T>).set = (value: T): void => applyThrottle(value);
  (readFn as unknown as WritableSignal<T>).update = (fn: (v: T) => T): void =>
    applyThrottle(fn(state()));
  (readFn as unknown as WritableSignal<T>).asReadonly = () => state.asReadonly();

  return readFn as unknown as WritableSignal<T>;
}
