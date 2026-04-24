# @signals-toolkit/core

Utilities and helpers to simplify working with **Angular Signals**.

[![npm version](https://img.shields.io/npm/v/@signals-toolkit/core)](https://www.npmjs.com/package/@signals-toolkit/core)
[![CI](https://github.com/piipe800/signals-toolkit/actions/workflows/test.yml/badge.svg)](https://github.com/piipe800/signals-toolkit/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Installation

```bash
npm install @signals-toolkit/core
```

**Requires:** Angular 16+ as a peer dependency.

---

## Helpers

- [computedMap](#computedmap)
- [computedFilter](#computedfilter)
- [computedReduce](#computedreduce)
- [signalStorage](#signalstorage)
- [signalFromObservable](#signalfromobservable)
- [toObservable](#toobservable)
- [debounceSignal](#debouncesignal)
- [throttleSignal](#throttlesignal)
- [distinctUntilChanged](#distinctuntilchanged)
- [watchSignal](#watchsignal)
- [computedAsync](#computedasync)
- [signalProfiler](#signalprofiler)

---

## Computed Utilities

### `computedMap`

Transforms each element of an array signal.

```typescript
import { signal } from '@angular/core';
import { computedMap } from '@signals-toolkit/core';

const items = signal([1, 2, 3]);
const doubled = computedMap(items, x => x * 2);

console.log(doubled()); // [2, 4, 6]

items.set([10, 20]);
console.log(doubled()); // [20, 40]
```

### `computedFilter`

Filters elements of an array signal based on a predicate.

```typescript
import { computedFilter } from '@signals-toolkit/core';

const todos = signal([
  { id: 1, done: true },
  { id: 2, done: false },
  { id: 3, done: true },
]);

const completed = computedFilter(todos, t => t.done);
console.log(completed()); // [{ id: 1, done: true }, { id: 3, done: true }]
```

### `computedReduce`

Reduces an array signal to a single computed value.

```typescript
import { computedReduce } from '@signals-toolkit/core';

const prices = signal([10, 25, 5]);
const total = computedReduce(prices, (sum, val) => sum + val, 0);

console.log(total()); // 40
```

---

## Storage

### `signalStorage`

Creates a `WritableSignal` that automatically syncs with `localStorage` (or any `Storage`) on every write. Restores the persisted value on initialization.

```typescript
import { signalStorage } from '@signals-toolkit/core';

const theme = signalStorage('theme', 'light');

theme.set('dark');
// localStorage now has: { "theme": "\"dark\"" }

// On the next page load, value is automatically restored:
const theme2 = signalStorage('theme', 'light');
console.log(theme2()); // 'dark'
```

**With sessionStorage:**

```typescript
const session = signalStorage('user', null, { storage: sessionStorage });
```

**With custom serializer:**

```typescript
const data = signalStorage('prefs', defaultPrefs, {
  serializer: v => btoa(JSON.stringify(v)),
  deserializer: s => JSON.parse(atob(s)),
});
```

---

## RxJS Bridge

### `signalFromObservable`

Subscribes to an Observable and bridges its values into signals. Returns `value`, `error`, and `loading` signals plus a `destroy()` cleanup function.

```typescript
import { signalFromObservable } from '@signals-toolkit/core';

const { value, loading, error, destroy } = signalFromObservable(users$, []);

// In a template:
// {{ loading() ? 'Loading...' : value().length + ' users' }}

// On component destroy:
destroy();
```

### `toObservable`

Converts a Signal to an Observable. Requires an Angular `Injector` for reactive change tracking; without it, emits the current value once and completes.

```typescript
import { inject, Injector } from '@angular/core';
import { toObservable } from '@signals-toolkit/core';

// Inside a component or service (injection context available):
const injector = inject(Injector);
const count$ = toObservable(countSignal, { injector });

count$.subscribe(v => console.log('count changed:', v));
```

---

## Rate Limiting

### `debounceSignal`

Creates a `WritableSignal` whose `.set()` calls are debounced. Only the last call within the delay window is applied. Ideal for search inputs.

```typescript
import { debounceSignal } from '@signals-toolkit/core';

const search = debounceSignal('', 500);

// In a component:
onInput(event: Event) {
  search.set((event.target as HTMLInputElement).value);
}

// signal only updates 500ms after the user stops typing
effect(() => fetchResults(search()));
```

**With options:**

```typescript
const search = debounceSignal('', { delay: 300, leading: true, trailing: false });
```

### `throttleSignal`

Creates a `WritableSignal` whose `.set()` calls are throttled (leading edge). Ideal for scroll or resize handlers.

```typescript
import { throttleSignal } from '@signals-toolkit/core';

const scrollY = throttleSignal(0, 100);

window.addEventListener('scroll', () => {
  scrollY.set(window.scrollY);
});

// signal updates at most once every 100ms
```

---

## Distinct Values

### `distinctUntilChanged`

Creates a computed Signal that only propagates when the value actually changes. Accepts an optional custom equality function.

```typescript
import { distinctUntilChanged } from '@signals-toolkit/core';

const raw = signal({ id: 1, name: 'Alice', updatedAt: Date.now() });

// Only recompute downstream when id changes
const stable = distinctUntilChanged(raw, (a, b) => a.id === b.id);
```

---

## Advanced

### `watchSignal`

Watches a signal and reacts to changes via `onChange` and `onError` callbacks. Requires an Angular `Injector` for reactive tracking.

```typescript
import { inject, Injector } from '@angular/core';
import { watchSignal } from '@signals-toolkit/core';

const injector = inject(Injector);

const ref = watchSignal(theme, {
  onChange: t => document.body.className = t,
  onError: e => console.error('theme error:', e),
  injector,
});

// On component destroy:
ref.destroy();
```

### `computedAsync`

Creates `value`, `loading`, and `error` signals driven by an async function over a source signal. Prevents stale results via request ID tracking. Requires an `Injector` to re-fetch reactively when the source signal changes.

```typescript
import { inject, Injector, signal } from '@angular/core';
import { computedAsync } from '@signals-toolkit/core';

const userId = signal(1);
const injector = inject(Injector);

const { value, loading, error } = computedAsync(
  userId,
  id => fetch(`/api/users/${id}`).then(r => r.json()),
  { initialValue: null, injector }
);

// Template:
// @if (loading()) { <spinner /> }
// @else if (error()) { <error-msg [error]="error()" /> }
// @else { <user-card [user]="value()" /> }
```

### `signalProfiler`

Lightweight performance profiler for measuring signal computation costs.

```typescript
import { signalProfiler } from '@signals-toolkit/core';

const profiler = signalProfiler();

profiler.start('transformUsers');
const users = computedMap(userSignal, transformUser);
users(); // trigger computation
profiler.stop('transformUsers');

profiler.report();
// [signals-profiler] transformUsers: 0.42ms

profiler.getEntries(); // [{ name, duration, timestamp }]
profiler.clear();
```

---

## Testing Utilities

### `createSignalHarness`

Wraps a `WritableSignal` with history tracking for easier test assertions.

```typescript
import { createSignalHarness } from '@signals-toolkit/core/testing';

const { signal: search, read, history } = createSignalHarness('');

search.set('hello');
search.set('world');

expect(read()).toBe('world');
expect(history()).toEqual(['', 'hello', 'world']);
```

---

## API Reference

| Helper | Returns | Requires injector? |
|--------|---------|-------------------|
| `computedMap(source, fn)` | `Signal<U[]>` | No |
| `computedFilter(source, fn)` | `Signal<T[]>` | No |
| `computedReduce(source, fn, init)` | `Signal<U>` | No |
| `signalStorage(key, init, opts?)` | `WritableSignal<T>` | No |
| `signalFromObservable(obs$, init)` | `ObservableSignalResult<T>` | No |
| `toObservable(signal, opts?)` | `Observable<T>` | For full tracking |
| `debounceSignal(init, delay)` | `WritableSignal<T>` | No |
| `throttleSignal(init, delay)` | `WritableSignal<T>` | No |
| `distinctUntilChanged(source, fn?)` | `Signal<T>` | No |
| `watchSignal(source, opts)` | `WatchRef` | For reactive tracking |
| `computedAsync(source, fn, opts?)` | `AsyncComputedResult<T>` | For reactive re-fetch |
| `signalProfiler()` | `SignalProfiler` | No |

---

## License

MIT © 2026 Andrés Felipe León Sánchez
