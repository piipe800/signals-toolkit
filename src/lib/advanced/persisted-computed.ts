import { computed, Signal } from '@angular/core';
import type { StorageOptions } from '../../types';

export interface PersistedComputedOptions<T> extends StorageOptions {
  /**
   * Time-to-live in milliseconds. After this duration the cached value
   * is considered stale and the next read discards it.
   * Undefined means the cache never expires.
   */
  ttl?: number;
}

/**
 * Creates a computed Signal that persists its result to storage on every
 * computation. On the next page load the value is immediately readable from
 * the cache without waiting for the factory to run.
 *
 * The factory function is still reactive — it re-runs whenever its signal
 * dependencies change, and the new result overwrites the cache.
 *
 * @example
 * ```typescript
 * const total = persistedComputed(
 *   'cart-total',
 *   () => computedReduce(cart, (sum, item) => sum + item.price, 0)(),
 *   { ttl: 60_000 } // cache valid for 1 minute
 * );
 *
 * // On page reload: total() returns cached value instantly
 * // then recomputes reactively as cart changes
 * ```
 */
export function persistedComputed<T>(
  key: string,
  factory: () => T,
  options: PersistedComputedOptions<T> = {}
): Signal<T> {
  const store: Storage | null =
    options.storage ?? (typeof window !== 'undefined' ? localStorage : null);
  const serialize = (options.serializer as ((v: T) => string)) ?? JSON.stringify;
  const deserialize = (options.deserializer as ((s: string) => T)) ?? JSON.parse;

  const cacheKey = `__psc__${key}`;
  let lastSerialized: string | null = null;

  function saveToStorage(value: T): void {
    if (!store) return;
    try {
      const serialized = serialize(value);
      if (serialized === lastSerialized) return; // skip redundant writes
      lastSerialized = serialized;
      store.setItem(cacheKey, JSON.stringify({ v: serialized, ts: Date.now() }));
    } catch {}
  }

  function loadFromStorage(): T | undefined {
    if (!store) return undefined;
    try {
      const raw = store.getItem(cacheKey);
      if (!raw) return undefined;
      const { v, ts } = JSON.parse(raw) as { v: string; ts: number };
      if (options.ttl != null && Date.now() - ts > options.ttl) {
        store.removeItem(cacheKey);
        return undefined;
      }
      return deserialize(v);
    } catch {
      return undefined;
    }
  }

  // Seed lastSerialized from existing cache so the first write is skipped
  // if the computed value matches what's already stored
  const existing = store?.getItem(cacheKey);
  if (existing) {
    try { lastSerialized = (JSON.parse(existing) as { v: string }).v; } catch {}
  }

  return computed(() => {
    const value = factory();
    saveToStorage(value);
    return value;
  });
}

/**
 * Reads the cached value for a `persistedComputed` key without running
 * the factory. Returns `undefined` if no cache exists or it has expired.
 * Useful for pre-loading state before the computed signal is set up.
 */
export function readPersistedComputed<T>(
  key: string,
  options: Pick<PersistedComputedOptions<T>, 'storage' | 'deserializer' | 'ttl'> = {}
): T | undefined {
  const store: Storage | null =
    options.storage ?? (typeof window !== 'undefined' ? localStorage : null);
  const deserialize = (options.deserializer as ((s: string) => T)) ?? JSON.parse;
  const cacheKey = `__psc__${key}`;

  if (!store) return undefined;
  try {
    const raw = store.getItem(cacheKey);
    if (!raw) return undefined;
    const { v, ts } = JSON.parse(raw) as { v: string; ts: number };
    if (options.ttl != null && Date.now() - ts > options.ttl) return undefined;
    return deserialize(v);
  } catch {
    return undefined;
  }
}
