# Contributing to @signals-toolkit/core

Thanks for your interest in contributing. This guide covers everything you need to get started.

---

## Getting started

```bash
git clone https://github.com/piipe800/signals-toolkit.git
cd signals-toolkit
npm install
npm test
```

All tests should pass before you start working.

---

## Project structure

```
src/
  lib/
    computed/       # computedMap, computedFilter, computedReduce
    storage/        # signalStorage, persistedComputed
    async/          # RxJS bridge, debounce, throttle, distinctUntilChanged
    advanced/       # watchSignal, computedAsync, signalProfiler, signalGroup
  testing/          # createSignalHarness
  types.ts          # shared interfaces
  index.ts          # public barrel export

tests/
  unit/             # one spec file per module
  integration/      # multi-helper scenario tests

docs/
  API.md            # complete technical reference
  MIGRATION.md      # RxJS → Signals guide
  BEST_PRACTICES.md # usage guidelines
  examples/         # real Angular component examples
  stackblitz/       # live demo app
```

---

## Development workflow

```bash
npm test           # run tests (watch mode: npm run test:watch)
npm run type-check # TypeScript strict check
npm run lint       # ESLint
npm run build      # verify build output
```

Run all three before opening a PR:

```bash
npm run type-check && npm test && npm run lint
```

---

## Adding a new helper

1. **Create the file** in the relevant `src/lib/` subfolder
2. **Export it** from the subfolder's `index.ts`
3. **Write unit tests** in `tests/unit/`
4. **Update integration tests** in `tests/integration/` if the helper interacts with others
5. **Document it** in `docs/API.md` — signature, parameters, return type, notes, example
6. **Add it to the README** — one section with a practical example
7. **Update the CHANGELOG** under `[Unreleased]`

### Helper checklist

- [ ] No `console.log` or `console.warn` in production code
- [ ] No Angular injection context required (or clearly documented when it is)
- [ ] Works without `effect()` where possible — prefer `computed()` and wrapper patterns
- [ ] SSR-safe — no direct `window`/`document` access without a guard
- [ ] Tests cover: happy path, edge cases (empty, null, type boundaries), reactive behavior
- [ ] TypeScript strict mode — no `any`, no type assertions unless necessary

---

## Pull request guidelines

- **One feature per PR** — keep diffs small and focused
- **Test coverage** — new helpers need unit tests; bug fixes need a regression test
- **PR title** follows [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat: add signalHistory helper`
  - `fix: debounceSignal leading edge fires twice`
  - `docs: add persistedComputed example to README`
- **Describe the why** — the PR description should explain the problem, not just the solution

---

## Reporting bugs

Open an issue with:
- Angular version
- `@signals-toolkit/core` version
- Minimal reproduction (StackBlitz link preferred)
- Expected vs actual behavior

---

## Code style

- **2 spaces** for indentation
- **No comments** unless the WHY is non-obvious — the code should be self-documenting
- **Short names** — `fn` over `callbackFunction`, `opts` over `options` in internals
- TypeScript strict mode is enforced by the CI

---

## License

By contributing you agree that your changes will be licensed under the [MIT License](LICENSE).
