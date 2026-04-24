import { Signal, Injector, effect } from '@angular/core';

export interface WatchOptions<T> {
  onChange: (value: T) => void;
  onError?: (error: Error) => void;
  /** Angular Injector for reactive tracking. Without it, onChange is called once immediately. */
  injector?: Injector;
}

export interface WatchRef {
  destroy(): void;
}

/**
 * Watches a signal and reacts to changes via callbacks.
 * Requires an injector for full reactive tracking.
 * Without an injector, calls onChange once with the current value.
 *
 * @example
 * ```typescript
 * const injector = inject(Injector);
 * const ref = watchSignal(theme, {
 *   onChange: t => document.body.className = t,
 *   onError: e => console.error(e),
 *   injector,
 * });
 * // On destroy:
 * ref.destroy();
 * ```
 */
export function watchSignal<T>(
  source: Signal<T>,
  options: WatchOptions<T>
): WatchRef {
  const safeCall = (value: T): void => {
    try {
      options.onChange(value);
    } catch (e) {
      options.onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  };

  if (!options.injector) {
    safeCall(source());
    return { destroy: () => {} };
  }

  const effectRef = effect(() => {
    safeCall(source());
  }, { injector: options.injector });

  return { destroy: () => effectRef.destroy() };
}
