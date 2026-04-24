/**
 * @signals-toolkit/core
 *
 * Utilities and helpers to simplify working with Angular Signals.
 *
 * @example
 * ```typescript
 * import { computedMap, computedFilter, signalStorage } from '@signals-toolkit/core';
 *
 * const items = signal([1, 2, 3]);
 * const doubled = computedMap(items, x => x * 2);
 * ```
 */

export * from './lib/index';
export * from './types';
