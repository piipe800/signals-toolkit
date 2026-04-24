# Migration Guide — RxJS to Angular Signals

A practical reference for replacing common RxJS patterns with Angular Signals
and `@signals-toolkit/core` helpers.

---

## Table of Contents

- [Philosophy](#philosophy)
- [BehaviorSubject → signal](#behaviorsubject--signal)
- [Observable.pipe(map) → computedMap](#observablepipemap--computedmap)
- [Observable.pipe(filter) → computedFilter](#observablepipefilter--computedfilter)
- [Observable.pipe(debounceTime) → debounceSignal](#observablepipedebouncetime--debouncesignal)
- [Observable.pipe(throttleTime) → throttleSignal](#observablepipethrottletime--throttlesignal)
- [Observable.pipe(distinctUntilChanged) → distinctUntilChanged](#observablepipedistinctuntilchanged--distinctuntilchanged)
- [combineLatest → computed](#combinelatest--computed)
- [switchMap (HTTP) → computedAsync](#switchmap-http--computedasync)
- [tap (side effects) → watchSignal](#tap-side-effects--watchsignal)
- [localStorage sync → signalStorage](#localstorage-sync--signalstorage)
- [Bridging — keeping RxJS and Signals together](#bridging--keeping-rxjs-and-signals-together)
- [When to keep RxJS](#when-to-keep-rxjs)

---

## Philosophy

Signals and RxJS solve different problems:

| | RxJS | Signals |
|--|------|---------|
| **Model** | Stream of events over time | Current state value |
| **Best for** | Async event handling, complex pipelines | UI state, derived data |
| **Execution** | Lazy (subscribes on demand) | Eager (always has a value) |
| **Cleanup** | Unsubscribe required | Automatic (Angular lifecycle) |
| **Learning curve** | High | Low |

**Rule of thumb:** If it's *state*, use a Signal. If it's an *event stream*, keep RxJS.

---

## BehaviorSubject → signal

```typescript
// Before — RxJS
private _count$ = new BehaviorSubject(0);
count$ = this._count$.asObservable();

increment() {
  this._count$.next(this._count$.getValue() + 1);
}
```

```typescript
// After — Signals
count = signal(0);

increment() {
  this.count.update(n => n + 1);
}
```

---

## Observable.pipe(map) → computedMap

```typescript
// Before — RxJS
const doubled$ = count$.pipe(map(n => n * 2));
const labels$  = items$.pipe(map(items => items.map(i => i.name.toUpperCase())));
```

```typescript
// After — Signals
import { computedMap } from '@signals-toolkit/core';

const doubled = computed(() => count() * 2);
const labels  = computedMap(items, i => i.name.toUpperCase());
```

---

## Observable.pipe(filter) → computedFilter

```typescript
// Before — RxJS
const active$    = todos$.pipe(map(todos => todos.filter(t => !t.done)));
const completed$ = todos$.pipe(map(todos => todos.filter(t => t.done)));
```

```typescript
// After — Signals
import { computedFilter } from '@signals-toolkit/core';

const active    = computedFilter(todos, t => !t.done);
const completed = computedFilter(todos, t => t.done);
```

---

## Observable.pipe(debounceTime) → debounceSignal

```typescript
// Before — RxJS
searchControl = new FormControl('');
results$ = this.searchControl.valueChanges.pipe(
  debounceTime(500),
  switchMap(query => this.api.search(query))
);
```

```typescript
// After — Signals
import { debounceSignal } from '@signals-toolkit/core';

search = debounceSignal('', 500);

// In the template: <input (input)="search.set($event.target.value)" />

constructor() {
  effect(() => this.fetchResults(this.search()));
}
```

---

## Observable.pipe(throttleTime) → throttleSignal

```typescript
// Before — RxJS
const scroll$ = fromEvent(window, 'scroll').pipe(
  throttleTime(200),
  map(() => window.scrollY)
);
```

```typescript
// After — Signals
import { throttleSignal } from '@signals-toolkit/core';

scrollY = throttleSignal(0, 200);

constructor() {
  window.addEventListener('scroll', () => {
    this.scrollY.set(window.scrollY);
  });
}
```

---

## Observable.pipe(distinctUntilChanged) → distinctUntilChanged

```typescript
// Before — RxJS
const stableUser$ = user$.pipe(
  distinctUntilChanged((a, b) => a.id === b.id)
);
```

```typescript
// After — Signals
import { distinctUntilChanged } from '@signals-toolkit/core';

stableUser = distinctUntilChanged(this.user, (a, b) => a.id === b.id);
```

---

## combineLatest → computed

```typescript
// Before — RxJS
const vm$ = combineLatest([user$, settings$, notifications$]).pipe(
  map(([user, settings, notifications]) => ({ user, settings, notifications }))
);
```

```typescript
// After — Signals
// No helper needed — computed() handles multiple signal dependencies natively
vm = computed(() => ({
  user:          this.user(),
  settings:      this.settings(),
  notifications: this.notifications(),
}));
```

---

## switchMap (HTTP) → computedAsync

```typescript
// Before — RxJS
const user$ = userId$.pipe(
  switchMap(id => this.http.get<User>(`/api/users/${id}`)),
  catchError(err => { this.error$.next(err); return EMPTY; })
);
```

```typescript
// After — Signals
import { computedAsync } from '@signals-toolkit/core';

const injector = inject(Injector);

{ value: user, loading, error } = computedAsync(
  this.userId,
  (id, abortSignal) =>
    fetch(`/api/users/${id}`, { signal: abortSignal }).then(r => r.json()),
  { initialValue: null, injector }
);
```

Key differences:
- `switchMap` cancels previous inner Observable. `computedAsync` aborts previous `fetch` via `AbortSignal`.
- Loading and error state are explicit signals — no need for separate `BehaviorSubject`s.

---

## tap (side effects) → watchSignal

```typescript
// Before — RxJS
theme$.pipe(
  tap(theme => document.body.className = theme),
  catchError(err => { console.error(err); return EMPTY; })
).subscribe();
```

```typescript
// After — Signals
import { watchSignal } from '@signals-toolkit/core';

const injector = inject(Injector);

ref = watchSignal(this.theme, {
  onChange: theme => document.body.className = theme,
  onError:  err   => console.error(err),
  injector,
});

ngOnDestroy() { this.ref.destroy(); }
```

---

## localStorage sync → signalStorage

```typescript
// Before — RxJS + manual sync
private _theme$ = new BehaviorSubject<string>(
  JSON.parse(localStorage.getItem('theme') ?? '"light"')
);

theme$ = this._theme$.asObservable();

setTheme(t: string) {
  this._theme$.next(t);
  localStorage.setItem('theme', JSON.stringify(t));
}
```

```typescript
// After — signalStorage
import { signalStorage } from '@signals-toolkit/core';

theme = signalStorage('theme', 'light');
// theme.set('dark') — saves to localStorage automatically
```

---

## Bridging — keeping RxJS and Signals together

Not everything can be migrated at once. These helpers let both coexist:

### Observable → Signal

```typescript
import { signalFromObservable } from '@signals-toolkit/core';

// Convert any Observable to signals — useful for legacy services
const { value: users, loading, error, destroy } = signalFromObservable(
  this.legacyService.users$,
  []
);
```

### Signal → Observable

```typescript
import { toObservable } from '@signals-toolkit/core';

const injector = inject(Injector);

// Expose a signal as Observable for legacy consumers
const theme$ = toObservable(this.theme, { injector });
theme$.subscribe(t => this.legacyService.applyTheme(t));
```

---

## When to keep RxJS

Not every RxJS pattern maps cleanly to Signals. Keep RxJS for:

| Pattern | Reason |
|---------|--------|
| `WebSocket` streams | Signals don't model infinite event streams |
| `retry`, `retryWhen` | Complex retry logic is easier with RxJS operators |
| `zip`, `forkJoin` | Joining multiple one-shot async operations |
| `scan` with complex accumulation | Stateful accumulation over an event stream |
| `interval`, `timer` | Periodic side effects belong in RxJS |
| Angular `HttpClient` (internal) | Keep the service layer in RxJS; convert at the component boundary |

**The recommended pattern:** keep RxJS inside services, convert to Signals at the component boundary using `signalFromObservable`.

```typescript
@Injectable()
export class UserService {
  // Stays RxJS inside the service
  getUser(id: number): Observable<User> {
    return this.http.get<User>(`/api/users/${id}`);
  }
}

@Component()
export class UserComponent {
  private svc = inject(UserService);

  // Convert at the boundary
  { value: user, loading } = signalFromObservable(
    this.svc.getUser(this.userId()),
    null
  );
}
```

---

*@signals-toolkit/core v1.1.0 — MIT © 2026 Andrés Felipe León Sánchez*
