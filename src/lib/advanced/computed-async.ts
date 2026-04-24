import { signal, Signal, Injector, effect } from '@angular/core';

export interface ComputedAsyncOptions<T> {
  initialValue?: T;
  /** Angular Injector for reactive re-fetching on source changes. */
  injector?: Injector;
}

export interface AsyncComputedResult<T> {
  value: Signal<T | null>;
  loading: Signal<boolean>;
  error: Signal<Error | null>;
}

/**
 * Creates a set of signals driven by an async function over a source signal.
 * Prevents stale results with request cancellation via ID tracking.
 * Requires an injector to reactively re-fetch when the source signal changes.
 *
 * @example
 * ```typescript
 * const userId = signal(1);
 * const injector = inject(Injector);
 * const { value, loading, error } = computedAsync(
 *   userId,
 *   id => fetch(`/api/users/${id}`).then(r => r.json()),
 *   { initialValue: null, injector }
 * );
 * ```
 */
export function computedAsync<TInput, TOutput>(
  source: Signal<TInput>,
  asyncFn: (value: TInput) => Promise<TOutput>,
  options: ComputedAsyncOptions<TOutput> = {}
): AsyncComputedResult<TOutput> {
  const valueState = signal<TOutput | null>(options.initialValue ?? null);
  const loadingState = signal(false);
  const errorState = signal<Error | null>(null);
  let currentRequestId = 0;

  async function runFetch(input: TInput): Promise<void> {
    const requestId = ++currentRequestId;
    loadingState.set(true);
    errorState.set(null);

    try {
      const result = await asyncFn(input);
      if (requestId === currentRequestId) {
        valueState.set(result);
        loadingState.set(false);
      }
    } catch (e) {
      if (requestId === currentRequestId) {
        errorState.set(e instanceof Error ? e : new Error(String(e)));
        loadingState.set(false);
      }
    }
  }

  if (options.injector) {
    effect(() => {
      void runFetch(source());
    }, { injector: options.injector, allowSignalWrites: true });
  } else {
    void runFetch(source());
  }

  return {
    value: valueState.asReadonly(),
    loading: loadingState.asReadonly(),
    error: errorState.asReadonly(),
  };
}
