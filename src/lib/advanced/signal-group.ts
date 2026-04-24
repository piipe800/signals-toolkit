import { signal, WritableSignal } from '@angular/core';

export type SignalGroupSignals<T extends Record<string, unknown>> = {
  [K in keyof T]: WritableSignal<T[K]>;
};

export type SignalGroupResult<T extends Record<string, unknown>> =
  SignalGroupSignals<T> & {
    /** Returns current value of all signals as a plain object. */
    snapshot(): T;
    /** Resets all signals to their original initial values. */
    reset(): void;
    /** Sets one or more signals by key. */
    patch(values: Partial<T>): void;
  };

/**
 * Groups related WritableSignals under a single object with snapshot,
 * reset, and patch utilities. Acts as a lightweight reactive store.
 *
 * @example
 * ```typescript
 * const form = signalGroup({
 *   name: '',
 *   email: '',
 *   age: 0,
 *   role: 'viewer' as 'viewer' | 'editor' | 'admin',
 * });
 *
 * form.name.set('Felipe');
 * form.patch({ email: 'felipe@example.com', age: 30 });
 * form.snapshot(); // { name: 'Felipe', email: 'felipe@example.com', age: 30, role: 'viewer' }
 * form.reset();    // all signals back to initial values
 * ```
 */
export function signalGroup<T extends Record<string, unknown>>(
  initialValues: T
): SignalGroupResult<T> {
  const keys = Object.keys(initialValues) as (keyof T)[];
  const initials = { ...initialValues };

  const signals = {} as SignalGroupSignals<T>;
  for (const key of keys) {
    (signals[key] as WritableSignal<unknown>) = signal(initialValues[key]);
  }

  const extra = {
    snapshot(): T {
      const out = {} as T;
      for (const key of keys) {
        out[key] = signals[key]() as T[keyof T];
      }
      return out;
    },

    reset(): void {
      for (const key of keys) {
        signals[key].set(initials[key] as T[keyof T]);
      }
    },

    patch(values: Partial<T>): void {
      for (const key of keys) {
        if (key in values) {
          signals[key].set(values[key] as T[keyof T]);
        }
      }
    },
  };

  return Object.assign({}, signals, extra) as SignalGroupResult<T>;
}
