import { Signal, Injector, effect } from '@angular/core';
import { Observable } from 'rxjs';

export interface ToObservableOptions {
  /**
   * Angular Injector for effect-based change tracking.
   * Without an injector, only the current value is emitted.
   */
  injector?: Injector;
}

/**
 * Converts a Signal to an Observable.
 * With an injector, tracks signal changes reactively.
 * Without an injector, emits the current value once and completes.
 *
 * @example
 * ```typescript
 * // Inside an Angular component (injection context available):
 * const injector = inject(Injector);
 * const obs$ = toObservable(mySignal, { injector });
 * ```
 */
export function toObservable<T>(
  source: Signal<T>,
  options: ToObservableOptions = {}
): Observable<T> {
  return new Observable<T>(subscriber => {
    if (!options.injector) {
      subscriber.next(source());
      subscriber.complete();
      return;
    }

    const effectRef = effect(() => {
      subscriber.next(source());
    }, { injector: options.injector });

    return () => effectRef.destroy();
  });
}
