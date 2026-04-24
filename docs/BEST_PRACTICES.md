# Best Practices — @signals-toolkit/core

Guidelines for using the library effectively in Angular applications.

---

## Table of Contents

- [Choosing the right helper](#choosing-the-right-helper)
- [Computed helpers](#computed-helpers)
- [Storage helpers](#storage-helpers)
- [Rate limiting](#rate-limiting)
- [Async patterns](#async-patterns)
- [Signal group](#signal-group)
- [Performance](#performance)
- [Testing](#testing)
- [Common mistakes](#common-mistakes)

---

## Choosing the right helper

```
I need to transform a list           → computedMap
I need to filter a list              → computedFilter
I need to aggregate a list           → computedReduce
I need to persist state              → signalStorage
I need to debounce user input        → debounceSignal
I need to throttle scroll/resize     → throttleSignal
I need to skip duplicate emissions   → distinctUntilChanged
I need to consume an Observable      → signalFromObservable
I need to fetch data reactively      → computedAsync
I need to react to signal changes    → watchSignal
I need to group related signals      → signalGroup
I need to cache a computation        → persistedComputed
I need to measure performance        → signalProfiler
```

---

## Computed helpers

### Chain them, don't nest

```typescript
// ✅ Good — each step is readable and independently testable
const products  = signal([...]);
const inStock   = computedFilter(products, p => p.stock > 0);
const withTax   = computedMap(inStock, p => ({ ...p, total: p.price * 1.19 }));
const subtotal  = computedReduce(withTax, (sum, p) => sum + p.total, 0);

// ❌ Avoid — nested computeds are harder to read and debug
const subtotal = computedReduce(
  computedMap(
    computedFilter(products, p => p.stock > 0),
    p => ({ ...p, total: p.price * 1.19 })
  ),
  (sum, p) => sum + p.total,
  0
);
```

### Use `computedFilter` before `computedMap`

Filter first to reduce the number of items the map function processes.

```typescript
// ✅ Filter first, then transform — fewer map calls
const labels = computedMap(
  computedFilter(items, i => i.active),
  i => i.name.toUpperCase()
);

// ❌ Transform all, then filter — wasteful
const labels = computedFilter(
  computedMap(items, i => ({ ...i, label: i.name.toUpperCase() })),
  i => i.active
);
```

---

## Storage helpers

### Use namespaced keys

Prefix storage keys to avoid collisions, especially in micro-frontends or multi-feature apps.

```typescript
// ✅ Namespaced
const theme  = signalStorage('app:theme', 'light');
const lang   = signalStorage('app:lang', 'en');
const userId = signalStorage('auth:userId', null);

// ❌ Generic — risky in large apps
const theme = signalStorage('theme', 'light');
```

### Don't store large objects

`signalStorage` serializes on every `.set()`. Large objects add write latency.

```typescript
// ✅ Store only the ID, fetch the rest
const selectedId = signalStorage('selected-user-id', null as number | null);

// ❌ Entire object on every keystroke
const selectedUser = signalStorage('selected-user', null as User | null);
```

### Handle SSR explicitly

`signalStorage` returns a regular `signal()` when `window` is unavailable (SSR). Your code should not depend on the value being persisted in that context.

```typescript
// ✅ SSR-safe — provide a sensible server-side default
const theme = signalStorage('theme', 'light'); // 'light' used on server
```

---

## Rate limiting

### `debounceSignal` for input-driven actions

Use debounce when you want to wait for the user to *stop* doing something.

```typescript
// ✅ Search, autocomplete, validation
const search  = debounceSignal('', 400);
const slug    = debounceSignal('', 600);
const zipCode = debounceSignal('', 800);
```

### `throttleSignal` for continuous events

Use throttle when you want to *limit frequency* without losing the leading/trailing values.

```typescript
// ✅ Scroll, resize, mouse move, drag
const scrollY   = throttleSignal(0, 100);
const mousePos  = throttleSignal({ x: 0, y: 0 }, 50);
const winWidth  = throttleSignal(window.innerWidth, 200);
```

### `distinctUntilChanged` for derived state

Add `distinctUntilChanged` when a signal updates frequently but the *logically relevant* part changes rarely.

```typescript
// ✅ Only re-render when the user's role changes, not on every profile update
const stableRole = distinctUntilChanged(user, (a, b) => a.role === b.role);
```

---

## Async patterns

### Always pass `abortSignal` to `fetch`

`computedAsync` creates an `AbortController` for each run. Pass the signal to benefit from real HTTP cancellation.

```typescript
// ✅ HTTP request is actually cancelled on source change
const { value } = computedAsync(
  userId,
  (id, abortSignal) => fetch(`/api/users/${id}`, { signal: abortSignal }).then(r => r.json()),
  { injector }
);

// ❌ Request runs to completion even if result is discarded
const { value } = computedAsync(
  userId,
  id => fetch(`/api/users/${id}`).then(r => r.json()),
  { injector }
);
```

### Set `initialValue` to avoid null checks

```typescript
// ✅ initialValue matches the expected type — no null guards needed
const { value: users } = computedAsync(userId, fetchUser, { initialValue: [], injector });
// users() is always User[], never null

// ❌ null initial value requires null checks everywhere
const { value: users } = computedAsync(userId, fetchUser, { injector });
// users() is User[] | null — template needs @if (users()) guards
```

### Call `destroy()` in `ngOnDestroy`

`signalFromObservable` does not clean itself up automatically.

```typescript
// ✅
export class UserListComponent implements OnDestroy {
  private { value, destroy } = signalFromObservable(this.svc.users$, []);

  ngOnDestroy() { this.destroy(); }
}
```

---

## Signal group

### Use `signalGroup` for forms, not for app state

`signalGroup` is a convenience wrapper, not a full state management solution. It works best for self-contained UI state like forms, filters, or settings panels.

```typescript
// ✅ Great for a form
const contactForm = signalGroup({ name: '', email: '', message: '' });

// ❌ Too flat for complex app state — use a service with individual signals
const appState = signalGroup({ user: null, cart: [], orders: [], notifications: [] });
```

### Combine with `signalStorage` for persisted forms

```typescript
// ✅ Draft form that survives accidental page reloads
const draft = signalGroup({
  title:   signalStorage('draft:title',   ''),
  content: signalStorage('draft:content', ''),
  tags:    signalStorage('draft:tags',    [] as string[]),
});
```

---

## Performance

### Measure before optimizing

Use `signalProfiler` to identify actual bottlenecks before adding `distinctUntilChanged` or restructuring your signal graph.

```typescript
const profiler = signalProfiler();

profiler.start('user-list-transform');
const processed = computedMap(users, expensiveTransform);
processed(); // force evaluation
profiler.stop('user-list-transform');

profiler.report(); // see actual ms cost before optimizing
```

### Avoid creating signals inside `computed`

Signals created inside a `computed` are re-created on every recomputation.

```typescript
// ✅ Create signals outside, use their values inside
const threshold = signal(10);
const filtered  = computedFilter(items, i => i.value > threshold());

// ❌ New signal created on every recomputation
const filtered = computed(() => {
  const t = signal(10); // ← new signal every time
  return items().filter(i => i.value > t());
});
```

---

## Testing

### Use `createSignalHarness` for history assertions

```typescript
import { createSignalHarness } from '@signals-toolkit/core';

it('search updates correctly after debounce', () => {
  vi.useFakeTimers();
  const { signal: input, history } = createSignalHarness('');
  const debounced = debounceSignal('', 300);

  // Drive debounced via input signal
  input.set('a');  debounced.set('a');
  input.set('ab'); debounced.set('ab');
  vi.advanceTimersByTime(300);

  expect(history()).toEqual(['', 'a', 'ab']);
  expect(debounced()).toBe('ab');
  vi.useRealTimers();
});
```

### Use fake timers for debounce/throttle tests

```typescript
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

it('only applies after delay', () => {
  const s = debounceSignal('', 500);
  s.set('hello');
  expect(s()).toBe('');         // not yet
  vi.advanceTimersByTime(500);
  expect(s()).toBe('hello');    // applied
});
```

---

## Common mistakes

### Calling a signal inside another signal's initial value

```typescript
// ❌ items() is called at construction time, not reactively
const count = signal(items().length);

// ✅ Use computed for reactive derivation
const count = computed(() => items().length);
```

### Using `signalStorage` for ephemeral state

```typescript
// ❌ localStorage for state that should reset on load
const modalOpen = signalStorage('modal-open', false);

// ✅ Regular signal for transient UI state
const modalOpen = signal(false);
```

### Forgetting to destroy `watchSignal` refs

```typescript
// ❌ Creates a leak if the component is destroyed
constructor() {
  watchSignal(this.theme, { onChange: applyTheme, injector });
}

// ✅ Store the ref and destroy it
ref = watchSignal(this.theme, { onChange: applyTheme, injector });
ngOnDestroy() { this.ref.destroy(); }
```

### Deeply nesting `persistedComputed`

`persistedComputed` writes to storage on every computation. If the factory depends on a signal that changes frequently, writes accumulate fast. Add `distinctUntilChanged` upstream or use `ttl` to rate-limit cache updates.

```typescript
// ✅ Gate writes with distinct values when the source is noisy
const stableQuery = distinctUntilChanged(rawQuery);
const results = persistedComputed('results', () => search(stableQuery()), { ttl: 30_000 });
```

---

*@signals-toolkit/core v1.1.0 — MIT © 2026 Andrés Felipe León Sánchez*
