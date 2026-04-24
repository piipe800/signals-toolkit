# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.3.0] - 2025-04-23

### Added — Advanced Utilities

- **`computedAsync(source, asyncFn, options?)`** — computed signal driven by a Promise. Handles loading, error, and stale request cancellation. Reactive with an Angular Injector.
- **`watchSignal(source, options)`** — observer pattern over a signal with `onChange` and `onError` callbacks. Reactive with an Angular Injector.
- **`signalProfiler()`** — lightweight performance profiler for measuring signal computation costs (`start`, `stop`, `report`, `getEntries`, `clear`).

### Added — Tooling

- ESLint 9 with `typescript-eslint` flat config (`eslint.config.mjs`)
- GitHub Actions `test.yml` — CI on Node 18/20 for push and PRs
- GitHub Actions `publish.yml` — auto-publish on GitHub Release with NPM provenance

---

## [0.2.0] - 2025-04-23

### Added — Async & RxJS Bridge

- **`signalFromObservable(obs$, initialValue)`** — bridges an Observable into `{ value, error, loading }` signals. Includes a `destroy()` cleanup function.
- **`toObservable(signal, { injector? })`** — converts a Signal to an Observable. Full tracking with injector; emits current value once without it.
- **`debounceSignal(initialValue, delay)`** — WritableSignal with debounced `.set()`. Supports `leading`/`trailing` options.
- **`throttleSignal(initialValue, delay)`** — WritableSignal with throttled `.set()`. Emits on leading edge by default.
- **`distinctUntilChanged(source, equalityFn?)`** — computed Signal that suppresses consecutive equal values. Accepts a custom equality function.

### Added — Testing Utilities

- **`createSignalHarness(initialValue)`** — wraps a WritableSignal with history tracking for use in tests.

---

## [0.1.0] - 2025-04-23

### Added — Initial Release (FASE 1 MVP)

- **`computedMap(source, mapFn)`** — transforms each element of an array signal.
- **`computedFilter(source, predicateFn)`** — filters elements of an array signal by predicate.
- **`computedReduce(source, reduceFn, initialValue)`** — reduces an array signal to a single computed value.
- **`signalStorage(key, initialValue, options?)`** — WritableSignal that syncs to `localStorage` (or custom storage) on every write. Restores persisted value on init.
- Core TypeScript types: `StorageOptions`, `DebounceOptions`, `ThrottleOptions`, `ComputedOptions`.
- Vitest test suite with jsdom environment.
- MIT License.
