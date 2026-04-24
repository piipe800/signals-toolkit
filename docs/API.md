# API Reference — @signals-toolkit/core

Complete technical reference for all helpers, types, and options.

---

## Table of Contents

- [Types](#types)
- [Computed](#computed)
  - [computedMap](#computedmap)
  - [computedFilter](#computedfilter)
  - [computedReduce](#computedreduce)
- [Storage](#storage)
  - [signalStorage](#signalstorage)
- [RxJS Bridge](#rxjs-bridge)
  - [signalFromObservable](#signalfromobservable)
  - [toObservable](#toobservable)
- [Rate Limiting](#rate-limiting)
  - [debounceSignal](#debouncesignal)
  - [throttleSignal](#throttlesignal)
- [Distinct Values](#distinct-values)
  - [distinctUntilChanged](#distinctuntilchanged)
- [Advanced](#advanced)
  - [watchSignal](#watchsignal)
  - [computedAsync](#computedasync)
  - [signalProfiler](#signalprofiler)
- [Testing](#testing)
  - [createSignalHarness](#createsignalharness)

---

## Types

```typescript
import type {
  StorageOptions,
  DebounceOptions,
  ThrottleOptions,
  ObservableSignalResult,
  ToObservableOptions,
  WatchOptions,
  WatchRef,
  ComputedAsyncOptions,
  AsyncComputedResult,
  SignalProfiler,
  ProfilerEntry,
  SignalHarness,
} from '@signals-toolkit/core';
```

### `StorageOptions`

```typescript
interface StorageOptions {
  /**
   * Storage backend.
   * @default localStorage
   */
  storage?: Storage;

  /**
   * Custom serializer. Called on every write.
   * @default JSON.stringify
   */
  serializer?: <T>(value: T) => string;

  /**
   * Custom deserializer. Called once on initialization.
   * @default JSON.parse
   */
  deserializer?: <T>(value: string) => T;
}
```

### `DebounceOptions`

```typescript
interface DebounceOptions {
  /** Delay in milliseconds. */
  delay: number;

  /**
   * Emit the last value after the delay window closes.
   * @default true
   */
  trailing?: boolean;

  /**
   * Emit the first value immediately when a new window opens.
   * @default false
   */
  leading?: boolean;
}
```

### `ThrottleOptions`

```typescript
interface ThrottleOptions {
  /** Throttle window in milliseconds. */
  delay: number;

  /**
   * Emit the last value at the end of the throttle window.
   * @default true
   */
  trailing?: boolean;

  /**
   * Emit immediately on the first call.
   * @default true
   */
  leading?: boolean;
}
```

### `ObservableSignalResult<T>`

```typescript
interface ObservableSignalResult<T> {
  /** Current value signal. Read-only. */
  value: Signal<T>;

  /** Error signal. Null when no error has occurred. */
  error: Signal<Error | null>;

  /** True while waiting for the first emission. */
  loading: Signal<boolean>;

  /** Unsubscribes from the source Observable. */
  destroy(): void;
}
```

### `WatchOptions<T>`

```typescript
interface WatchOptions<T> {
  /** Called every time the signal emits a new value. */
  onChange: (value: T) => void;

  /** Called if onChange throws. */
  onError?: (error: Error) => void;

  /**
   * Angular Injector for reactive tracking.
   * Without it, onChange is called once immediately with the current value.
   */
  injector?: Injector;
}
```

### `WatchRef`

```typescript
interface WatchRef {
  /** Stops watching and cleans up the underlying effect. */
  destroy(): void;
}
```

### `AsyncComputedResult<T>`

```typescript
interface AsyncComputedResult<T> {
  /** Current resolved value. Null until the first resolution. */
  value: Signal<T | null>;

  /** True while an async operation is in progress. */
  loading: Signal<boolean>;

  /** Last error. Null if no error occurred. */
  error: Signal<Error | null>;
}
```

### `ProfilerEntry`

```typescript
interface ProfilerEntry {
  /** Name passed to profiler.start(). */
  name: string;

  /** Duration in milliseconds. */
  duration: number;

  /** Unix timestamp (Date.now()) of when stop() was called. */
  timestamp: number;
}
```

---

## Computed

### `computedMap`

```typescript
function computedMap<T, U>(
  source: Signal<T[]>,
  mapFn: (item: T, index: number) => U
): Signal<U[]>
```

Creates a computed signal that transforms each element of an array signal.
Re-evaluates whenever `source` changes.

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | `Signal<T[]>` | Array signal to map over |
| `mapFn` | `(item: T, index: number) => U` | Transform function |

**Returns:** `Signal<U[]>` — read-only computed signal.

```typescript
const prices = signal([100, 200, 300]);
const withTax = computedMap(prices, p => p * 1.19);
// withTax() → [119, 238, 357]
```

---

### `computedFilter`

```typescript
function computedFilter<T>(
  source: Signal<T[]>,
  predicateFn: (item: T, index: number) => boolean
): Signal<T[]>
```

Creates a computed signal that filters elements based on a predicate.
Re-evaluates whenever `source` changes.

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | `Signal<T[]>` | Array signal to filter |
| `predicateFn` | `(item: T, index: number) => boolean` | Filter condition |

**Returns:** `Signal<T[]>` — read-only computed signal.

```typescript
const numbers = signal([1, 2, 3, 4, 5, 6]);
const evens = computedFilter(numbers, n => n % 2 === 0);
// evens() → [2, 4, 6]
```

---

### `computedReduce`

```typescript
function computedReduce<T, U>(
  source: Signal<T[]>,
  reduceFn: (accumulator: U, current: T, index: number) => U,
  initialValue: U
): Signal<U>
```

Creates a computed signal that reduces an array to a single value.
Re-evaluates whenever `source` changes.

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | `Signal<T[]>` | Array signal to reduce |
| `reduceFn` | `(acc: U, current: T, index: number) => U` | Reducer function |
| `initialValue` | `U` | Starting accumulator value |

**Returns:** `Signal<U>` — read-only computed signal.

```typescript
const items = signal([{ qty: 2 }, { qty: 5 }, { qty: 1 }]);
const total = computedReduce(items, (sum, item) => sum + item.qty, 0);
// total() → 8
```

---

## Storage

### `signalStorage`

```typescript
function signalStorage<T>(
  key: string,
  initialValue: T,
  options?: StorageOptions
): WritableSignal<T>
```

Creates a `WritableSignal` that persists its value to `localStorage` (or a custom `Storage`) on every write. On initialization, restores the previously saved value if one exists.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Storage key |
| `initialValue` | `T` | Value to use if nothing is stored yet |
| `options` | `StorageOptions` | Optional configuration |

**Returns:** `WritableSignal<T>` — behaves exactly like a regular `signal()` with automatic persistence.

**Notes:**
- Writes are synchronous — storage is updated immediately on `.set()` and `.update()`.
- If deserialization fails on init (corrupted storage), falls back to `initialValue`.
- Safe to use in SSR environments — returns a regular signal when `window` is unavailable.

```typescript
// Basic
const theme = signalStorage('theme', 'light');
theme.set('dark'); // persisted immediately

// With sessionStorage
const token = signalStorage('token', null, { storage: sessionStorage });

// Works like a normal WritableSignal
theme.update(t => t === 'light' ? 'dark' : 'light');
const readonly = theme.asReadonly();
```

---

## RxJS Bridge

### `signalFromObservable`

```typescript
function signalFromObservable<T>(
  source$: Observable<T>,
  initialValue: T
): ObservableSignalResult<T>
```

Subscribes to an Observable and exposes its state as three read-only signals.

| Parameter | Type | Description |
|-----------|------|-------------|
| `source$` | `Observable<T>` | Source Observable |
| `initialValue` | `T` | Value of `value` signal before first emission |

**Returns:** `ObservableSignalResult<T>`

**Notes:**
- `loading` starts as `true` and becomes `false` after the first emission, error, or completion.
- Call `destroy()` when the consuming component or service is destroyed to prevent memory leaks.
- Synchronous observables (e.g. `of(...)`) resolve immediately.

```typescript
const { value, loading, error, destroy } = signalFromObservable(
  this.http.get<User[]>('/api/users'),
  []
);

// loading() → true initially
// value()   → [] initially, then the users array
// error()   → null unless the request fails

ngOnDestroy() { destroy(); }
```

---

### `toObservable`

```typescript
function toObservable<T>(
  source: Signal<T>,
  options?: ToObservableOptions
): Observable<T>
```

```typescript
interface ToObservableOptions {
  injector?: Injector;
}
```

Converts a Signal to an Observable.

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | `Signal<T>` | Signal to convert |
| `options.injector` | `Injector` | Required for reactive change tracking |

**Behavior by mode:**

| Mode | Behavior |
|------|----------|
| With `injector` | Emits every time the signal changes. Cleans up when unsubscribed. |
| Without `injector` | Emits the current value once and completes immediately. |

```typescript
// Reactive (inside injection context):
const injector = inject(Injector);
const count$ = toObservable(countSignal, { injector });
count$.subscribe(v => console.log(v)); // emits on every change

// Snapshot (outside injection context or in tests):
const snapshot$ = toObservable(countSignal);
snapshot$.subscribe(v => console.log(v)); // emits current value, then completes
```

---

## Rate Limiting

### `debounceSignal`

```typescript
function debounceSignal<T>(
  initialValue: T,
  delayMsOrOptions: number | DebounceOptions
): WritableSignal<T>
```

Creates a `WritableSignal` whose value only updates after calls to `.set()` have stopped for the specified delay.

| Parameter | Type | Description |
|-----------|------|-------------|
| `initialValue` | `T` | Initial signal value |
| `delayMsOrOptions` | `number \| DebounceOptions` | Delay in ms or full options object |

**Returns:** `WritableSignal<T>`

**Notes:**
- Each call to `.set()` restarts the timer.
- The signal value does not change until the timer fires.
- Supports `leading` (fire immediately on first call) and `trailing` (fire after delay) edges.

```typescript
// Simple — trailing only (default)
const search = debounceSignal('', 500);
search.set('a');
search.set('ab');
search.set('abc');
// After 500ms: search() → 'abc'

// Leading — fire immediately on first call
const input = debounceSignal('', { delay: 300, leading: true, trailing: false });
input.set('x'); // search() → 'x' immediately
input.set('xy'); // resets timer, does not fire again until window closes
```

---

### `throttleSignal`

```typescript
function throttleSignal<T>(
  initialValue: T,
  delayMsOrOptions: number | ThrottleOptions
): WritableSignal<T>
```

Creates a `WritableSignal` that emits at most once per delay window.

| Parameter | Type | Description |
|-----------|------|-------------|
| `initialValue` | `T` | Initial signal value |
| `delayMsOrOptions` | `number \| ThrottleOptions` | Window in ms or full options object |

**Returns:** `WritableSignal<T>`

**Default behavior:** leading + trailing — emits immediately on first call, then emits the last value received when the window closes.

```typescript
const scrollY = throttleSignal(0, 100);

window.addEventListener('scroll', () => {
  scrollY.set(window.scrollY);
  // At most one update every 100ms
});

// Leading only — emit immediately, ignore trailing
const position = throttleSignal(0, { delay: 200, leading: true, trailing: false });
```

---

## Distinct Values

### `distinctUntilChanged`

```typescript
function distinctUntilChanged<T>(
  source: Signal<T>,
  equalityFn?: (a: T, b: T) => boolean
): Signal<T>
```

Creates a computed Signal that only propagates when the new value is different from the previous one.

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | `Signal<T>` | Source signal to watch |
| `equalityFn` | `(a: T, b: T) => boolean` | Custom equality check. Defaults to `===`. |

**Returns:** `Signal<T>` — read-only computed signal.

**Notes:**
- When values are considered equal, the signal returns the **same object reference** as before, preventing downstream computed signals and effects from re-executing.
- Useful for optimizing performance when a signal changes frequently but the logically relevant part rarely changes.

```typescript
// Primitives — uses === by default
const counter = signal(0);
const distinct = distinctUntilChanged(counter);

counter.set(0); // no downstream update (same value)
counter.set(1); // downstream updates

// Objects — custom equality
const user = signal({ id: 1, name: 'Felipe', updatedAt: Date.now() });
const stableUser = distinctUntilChanged(user, (a, b) => a.id === b.id);

// updatedAt changes every second, but stableUser() won't propagate
// until user().id changes
```

---

## Advanced

### `watchSignal`

```typescript
function watchSignal<T>(
  source: Signal<T>,
  options: WatchOptions<T>
): WatchRef
```

Watches a signal and calls `onChange` on every emission. Errors in `onChange` are caught and forwarded to `onError` instead of propagating.

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | `Signal<T>` | Signal to watch |
| `options.onChange` | `(value: T) => void` | Called on each emission |
| `options.onError` | `(error: Error) => void` | Called if onChange throws |
| `options.injector` | `Injector` | Required for reactive tracking |

**Returns:** `WatchRef` with a `destroy()` method.

**Behavior without injector:** `onChange` is called once immediately with the current value. `destroy()` is a no-op.

```typescript
const injector = inject(Injector);

const ref = watchSignal(theme, {
  onChange: t => document.body.setAttribute('data-theme', t),
  onError: e => console.error('theme error', e),
  injector,
});

ngOnDestroy() {
  ref.destroy(); // stops watching, cleans up the effect
}
```

---

### `computedAsync`

```typescript
function computedAsync<TInput, TOutput>(
  source: Signal<TInput>,
  asyncFn: (value: TInput) => Promise<TOutput>,
  options?: ComputedAsyncOptions<TOutput>
): AsyncComputedResult<TOutput>
```

```typescript
interface ComputedAsyncOptions<T> {
  initialValue?: T;
  injector?: Injector;
}
```

Creates a set of signals driven by an async function. When the source signal changes and an `injector` is provided, the async function re-runs automatically. Stale results from previous runs are discarded.

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | `Signal<TInput>` | Source signal — its value is passed to `asyncFn` |
| `asyncFn` | `(value: TInput) => Promise<TOutput>` | Async operation |
| `options.initialValue` | `TOutput` | Value of `value` signal before first resolution |
| `options.injector` | `Injector` | Required for reactive re-fetching on source changes |

**Returns:** `AsyncComputedResult<TOutput>`

**Race condition handling:** Each run is assigned a unique ID. If a newer run starts before an older one finishes, the older result is silently discarded.

```typescript
const userId = signal(1);
const injector = inject(Injector);

const { value, loading, error } = computedAsync(
  userId,
  async (id) => {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error('Request failed');
    return res.json() as Promise<User>;
  },
  { initialValue: null, injector }
);

// userId.set(2):
// → loading() becomes true
// → if userId(1) was still loading, its result is discarded
// → value() updates when userId(2) resolves
```

---

### `signalProfiler`

```typescript
function signalProfiler(): SignalProfiler
```

```typescript
interface SignalProfiler {
  start(name: string): void;
  stop(name: string): number;   // returns duration in ms
  report(): void;               // logs all entries to console
  getEntries(): readonly ProfilerEntry[];
  clear(): void;
}
```

Creates a lightweight profiler for measuring how long signal-related operations take.

**Notes:**
- Uses `performance.now()` for high-resolution timing.
- Multiple operations can be measured simultaneously using different names.
- `stop()` returns `0` if called with an unknown name (no matching `start()`).
- `getEntries()` returns a copy — mutating it does not affect the profiler.

```typescript
const profiler = signalProfiler();

// Measure a single operation
profiler.start('transform');
const result = computedMap(largeList, expensiveFn);
result(); // force evaluation
const duration = profiler.stop('transform'); // e.g. 14.3

// Measure multiple simultaneously
profiler.start('op-a');
profiler.start('op-b');
doA();
profiler.stop('op-a');
doB();
profiler.stop('op-b');

profiler.report();
// [signals-profiler] op-a: 4.21ms
// [signals-profiler] op-b: 9.87ms

profiler.clear(); // reset for next measurement session
```

---

## Testing

### `createSignalHarness`

```typescript
function createSignalHarness<T>(initialValue: T): {
  signal: WritableSignal<T>;
  read(): T;
  history(): readonly T[];
}
```

Creates a `WritableSignal` that tracks every value set through it. Useful for asserting that a signal received specific values in a specific order during a test.

| Parameter | Type | Description |
|-----------|------|-------------|
| `initialValue` | `T` | Starting value |

**Returns:**
| Property | Type | Description |
|----------|------|-------------|
| `signal` | `WritableSignal<T>` | The signal to pass to the code under test |
| `read()` | `() => T` | Returns the current value |
| `history()` | `() => readonly T[]` | All values ever set, including `initialValue` |

```typescript
import { createSignalHarness } from '@signals-toolkit/core';

it('should filter correctly when source changes', () => {
  const { signal: source, history } = createSignalHarness([1, 2, 3]);
  const evens = computedFilter(source, n => n % 2 === 0);

  expect(evens()).toEqual([2]);

  source.set([10, 11, 12, 13]);
  expect(evens()).toEqual([10, 12]);

  expect(history()).toEqual([
    [1, 2, 3],
    [10, 11, 12, 13],
  ]);
});
```

---

*@signals-toolkit/core v0.3.0 — MIT © 2026 Andrés Felipe León Sánchez*
