import { signal, WritableSignal } from '@angular/core';

export interface SignalHarness<T> {
  /** Read current value */
  read(): T;
  /** Full history of values set via this harness */
  history(): readonly T[];
}

/**
 * Creates a WritableSignal with history tracking for use in tests.
 *
 * @example
 * ```typescript
 * const { signal: search, read, history } = createSignalHarness('');
 * search.set('hello');
 * expect(read()).toBe('hello');
 * expect(history()).toEqual(['', 'hello']);
 * ```
 */
export function createSignalHarness<T>(initialValue: T): {
  signal: WritableSignal<T>;
  read(): T;
  history(): readonly T[];
} {
  const state = signal<T>(initialValue);
  const _history: T[] = [initialValue];

  function readFn(): T { return state(); }
  (readFn as unknown as WritableSignal<T>).set = (value: T): void => {
    state.set(value);
    _history.push(value);
  };
  (readFn as unknown as WritableSignal<T>).update = (fn: (v: T) => T): void => {
    state.update(fn);
    _history.push(state());
  };
  (readFn as unknown as WritableSignal<T>).asReadonly = () => state.asReadonly();

  return {
    signal: readFn as unknown as WritableSignal<T>,
    read: () => state(),
    history: () => [..._history],
  };
}
