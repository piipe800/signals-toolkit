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
 * Passes an AbortSignal to the async function so in-flight HTTP requests can
 * be cancelled when the source signal changes.
 * Requires an injector to reactively re-fetch when the source signal changes.
 *
 * @example
 * ```typescript
 * const userId = signal(1);
 * const injector = inject(Injector);
 * const { value, loading, error } = computedAsync(
 *   userId,
 *   (id, signal) => fetch(`/api/users/${id}`, { signal }).then(r => r.json()),
 *   { initialValue: null, injector }
 * );
 * // When userId changes, the previous fetch is aborted automatically
 * ```
 */
export function computedAsync<TInput, TOutput>(
  source: Signal<TInput>,
  asyncFn: (value: TInput, abortSignal: AbortSignal) => Promise<TOutput>,
  options: ComputedAsyncOptions<TOutput> = {}
): AsyncComputedResult<TOutput> {
  const valueState = signal<TOutput | null>(options.initialValue ?? null);
  const loadingState = signal(false);
  const errorState = signal<Error | null>(null);
  let currentRequestId = 0;
  let currentAbortController: AbortController | null = null;

  async function runFetch(input: TInput): Promise<void> {
    // Cancel the previous in-flight request
    currentAbortController?.abort();
    const abortController = new AbortController();
    currentAbortController = abortController;

    const requestId = ++currentRequestId;
    loadingState.set(true);
    errorState.set(null);

    try {
      const result = await asyncFn(input, abortController.signal);
      if (requestId === currentRequestId) {
        valueState.set(result);
        loadingState.set(false);
        currentAbortController = null;
      }
    } catch (e) {
      // AbortError is intentional — silently ignore (DOMException doesn't extend Error in Node.js)
      if (e != null && (e as { name?: string }).name === 'AbortError') return;
      if (requestId === currentRequestId) {
        errorState.set(e instanceof Error ? e : new Error(String(e)));
        loadingState.set(false);
        currentAbortController = null;
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
