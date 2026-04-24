import { signal, WritableSignal } from '@angular/core';
import type { StorageOptions } from '../../types';

/**
 * Creates a WritableSignal that syncs with browser storage on every write.
 * Restores persisted value on initialization.
 *
 * @example
 * ```typescript
 * const theme = signalStorage('theme', 'light');
 * theme.set('dark'); // saves to localStorage
 * // On reload: value is restored automatically
 * ```
 */
export function signalStorage<T>(
  key: string,
  initialValue: T,
  options: StorageOptions = {}
): WritableSignal<T> {
  const storageBackend: Storage | null =
    options.storage ?? (typeof window !== 'undefined' ? localStorage : null);
  const serialize = (options.serializer as ((v: T) => string)) ?? JSON.stringify;
  const deserialize = (options.deserializer as ((s: string) => T)) ?? JSON.parse;

  let initialState = initialValue;
  if (storageBackend) {
    try {
      const stored = storageBackend.getItem(key);
      if (stored !== null) initialState = deserialize(stored);
    } catch {}
  }

  const state = signal(initialState);

  function persist(value: T): void {
    if (!storageBackend) return;
    try {
      storageBackend.setItem(key, serialize(value));
    } catch {}
  }

  persist(initialState);

  // Wrap signal to intercept writes for synchronous persistence
  function readFn(): T { return state(); }
  (readFn as unknown as WritableSignal<T>).set = (value: T): void => {
    state.set(value);
    persist(value);
  };
  (readFn as unknown as WritableSignal<T>).update = (fn: (value: T) => T): void => {
    state.update(fn);
    persist(state());
  };
  (readFn as unknown as WritableSignal<T>).asReadonly = () => state.asReadonly();

  return readFn as unknown as WritableSignal<T>;
}
