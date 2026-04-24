import { signal, Signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

export interface ObservableSignalResult<T> {
  value: Signal<T>;
  error: Signal<Error | null>;
  loading: Signal<boolean>;
  destroy(): void;
}

/**
 * Subscribes to an Observable and bridges its values into a Signal.
 * Returns value, error, and loading signals plus a destroy function.
 *
 * @example
 * ```typescript
 * const { value, loading, destroy } = signalFromObservable(users$, []);
 * // Use value() in template, call destroy() on component teardown
 * ```
 */
export function signalFromObservable<T>(
  source$: Observable<T>,
  initialValue: T
): ObservableSignalResult<T> {
  const valueState = signal<T>(initialValue);
  const errorState = signal<Error | null>(null);
  const loadingState = signal(true);

  const subscription: Subscription = source$.subscribe({
    next: (v) => { valueState.set(v); loadingState.set(false); },
    error: (e: unknown) => {
      errorState.set(e instanceof Error ? e : new Error(String(e)));
      loadingState.set(false);
    },
    complete: () => loadingState.set(false),
  });

  return {
    value: valueState.asReadonly(),
    error: errorState.asReadonly(),
    loading: loadingState.asReadonly(),
    destroy: () => subscription.unsubscribe(),
  };
}
