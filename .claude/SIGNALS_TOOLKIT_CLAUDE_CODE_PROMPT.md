# 🚀 Signals Toolkit - Setup Completo con Claude Code

## Objetivo
Crear toda la estructura del proyecto **@signals-toolkit** listos para FASE 1 (MVP).

---

## 📋 PASO 1: Crear estructura de carpetas

Ejecuta estos comandos en terminal:

```bash
# Ir a la carpeta del proyecto
cd /home/claude/signals-toolkit

# Crear estructura de carpetas
mkdir -p src/{lib/{computed,storage,async},testing}
mkdir -p tests/{unit,integration}
mkdir -p docs/{examples,api}
mkdir -p .github/workflows

# Listar para confirmar
tree -L 3 src/
```

**Resultado esperado:**
```
src/
├── lib/
│   ├── computed/
│   ├── storage/
│   ├── async/
│   └── index.ts
├── testing/
│   └── index.ts
└── types.ts

tests/
├── unit/
└── integration/

docs/
├── examples/
└── api/
```

---

## 📋 PASO 2: Crear archivos core

### A. Archivo: `src/types.ts`
```typescript
/**
 * Core type definitions for signals-toolkit
 */

export type SignalValue<T> = T;

export interface ComputedOptions {
  /**
   * If true, the computed signal will track its dependencies
   */
  track?: boolean;
}

export interface StorageOptions {
  /**
   * Storage backend (localStorage or sessionStorage)
   * @default localStorage
   */
  storage?: Storage;
  /**
   * Serializer function
   */
  serializer?: <T>(value: T) => string;
  /**
   * Deserializer function
   */
  deserializer?: <T>(value: string) => T;
}

export interface DebounceOptions {
  /**
   * Debounce delay in milliseconds
   */
  delay: number;
  /**
   * If true, emit value on trailing edge
   * @default true
   */
  trailing?: boolean;
  /**
   * If true, emit value on leading edge
   * @default false
   */
  leading?: boolean;
}

export interface ThrottleOptions {
  /**
   * Throttle delay in milliseconds
   */
  delay: number;
  /**
   * If true, emit value on trailing edge
   * @default true
   */
  trailing?: boolean;
  /**
   * If true, emit value on leading edge
   * @default false
   */
  leading?: boolean;
}
```

### B. Archivo: `src/lib/computed/map.ts`
```typescript
import { computed, Signal } from '@angular/core';

/**
 * Creates a computed signal that transforms each element of an array signal
 * 
 * @example
 * ```typescript
 * const items = signal([1, 2, 3]);
 * const doubled = computedMap(items, x => x * 2);
 * console.log(doubled()); // [2, 4, 6]
 * ```
 */
export function computedMap<T, U>(
  source: Signal<T[]>,
  mapFn: (item: T, index: number) => U
) {
  return computed(() => {
    const items = source();
    return items.map((item, index) => mapFn(item, index));
  });
}
```

### C. Archivo: `src/lib/computed/filter.ts`
```typescript
import { computed, Signal } from '@angular/core';

/**
 * Creates a computed signal that filters elements based on a predicate
 * 
 * @example
 * ```typescript
 * const todos = signal([
 *   { id: 1, done: true },
 *   { id: 2, done: false }
 * ]);
 * const completed = computedFilter(todos, t => t.done);
 * console.log(completed()); // [{ id: 1, done: true }]
 * ```
 */
export function computedFilter<T>(
  source: Signal<T[]>,
  predicateFn: (item: T, index: number) => boolean
) {
  return computed(() => {
    const items = source();
    return items.filter((item, index) => predicateFn(item, index));
  });
}
```

### D. Archivo: `src/lib/computed/reduce.ts`
```typescript
import { computed, Signal } from '@angular/core';

/**
 * Creates a computed signal that reduces an array to a single value
 * 
 * @example
 * ```typescript
 * const items = signal([1, 2, 3, 4]);
 * const sum = computedReduce(items, (acc, val) => acc + val, 0);
 * console.log(sum()); // 10
 * ```
 */
export function computedReduce<T, U>(
  source: Signal<T[]>,
  reduceFn: (accumulator: U, current: T, index: number) => U,
  initialValue: U
) {
  return computed(() => {
    const items = source();
    return items.reduce((acc, item, index) => reduceFn(acc, item, index), initialValue);
  });
}
```

### E. Archivo: `src/lib/computed/index.ts`
```typescript
export { computedMap } from './map';
export { computedFilter } from './filter';
export { computedReduce } from './reduce';
```

### F. Archivo: `src/lib/storage/signal-storage.ts`
```typescript
import { signal, effect, Signal } from '@angular/core';
import type { StorageOptions } from '../../types';

/**
 * Creates a signal that syncs with browser storage (localStorage or sessionStorage)
 * 
 * @example
 * ```typescript
 * // Auto-syncs theme preference to localStorage
 * const theme = signalStorage('theme', 'light');
 * 
 * theme.set('dark'); // Automatically saves to localStorage
 * 
 * // On page reload, value is restored from storage
 * ```
 */
export function signalStorage<T>(
  key: string,
  initialValue: T,
  options: StorageOptions = {}
): Signal<T> {
  const {
    storage = typeof window !== 'undefined' ? localStorage : null,
    serializer = JSON.stringify,
    deserializer = JSON.parse
  } = options;

  if (!storage) {
    console.warn('Storage not available, returning regular signal');
    return signal(initialValue);
  }

  // Try to restore from storage, fallback to initial value
  let initialState = initialValue;
  try {
    const stored = storage.getItem(key);
    if (stored !== null) {
      initialState = deserializer(stored);
    }
  } catch (error) {
    console.error(`Failed to deserialize storage key "${key}":`, error);
  }

  const state = signal(initialState);

  // Sync signal changes to storage
  effect(() => {
    const value = state();
    try {
      storage.setItem(key, serializer(value));
    } catch (error) {
      console.error(`Failed to serialize value for key "${key}":`, error);
    }
  });

  return state;
}
```

### G. Archivo: `src/lib/storage/index.ts`
```typescript
export { signalStorage } from './signal-storage';
```

### H. Archivo: `src/lib/index.ts`
```typescript
// Computed utilities
export * from './computed/index';

// Storage utilities
export * from './storage/index';

// Types will be added when we add async utilities
```

### I. Archivo: `src/testing/index.ts`
```typescript
/**
 * Testing utilities for signals-toolkit
 * This module will contain test helpers
 */

export {};
```

### J. Archivo: `src/index.ts`
```typescript
/**
 * @signals-toolkit
 * 
 * A collection of utilities and helpers to simplify working with Angular Signals.
 * 
 * @example
 * ```typescript
 * import { computedMap, computedFilter, signalStorage } from '@signals-toolkit/core';
 * 
 * const items = signal([1, 2, 3]);
 * const doubled = computedMap(items, x => x * 2);
 * ```
 */

export * from './lib/index';
export * from './types';
```

---

## 📋 PASO 3: Crear archivo de licencia

### K. Archivo: `LICENSE`
```
MIT License

Copyright (c) 2025 Andrés Felipe León Sánchez

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 📋 PASO 4: Crear README básico

### L. Archivo: `README.md`
```markdown
# @signals-toolkit

Utilidades y helpers para simplificar el trabajo con **Angular Signals**.

## 📦 Instalación

```bash
npm install @signals-toolkit/core
```

## 🚀 Uso rápido

### `computedMap` - Transformar arrays

```typescript
import { signal } from '@angular/core';
import { computedMap } from '@signals-toolkit/core';

const items = signal([1, 2, 3]);
const doubled = computedMap(items, x => x * 2);

console.log(doubled()); // [2, 4, 6]
```

### `computedFilter` - Filtrar datos

```typescript
import { computedFilter } from '@signals-toolkit/core';

const todos = signal([
  { id: 1, done: true },
  { id: 2, done: false }
]);

const completed = computedFilter(todos, t => t.done);
console.log(completed()); // [{ id: 1, done: true }]
```

### `computedReduce` - Agregar datos

```typescript
import { computedReduce } from '@signals-toolkit/core';

const numbers = signal([1, 2, 3, 4]);
const sum = computedReduce(numbers, (acc, val) => acc + val, 0);

console.log(sum()); // 10
```

### `signalStorage` - Sincronizar con localStorage

```typescript
import { signalStorage } from '@signals-toolkit/core';

// Auto-syncs to localStorage
const theme = signalStorage('theme', 'light');

// Change and it saves automatically
theme.set('dark');

// On page reload, it restores from storage
```

## 📖 Documentación completa

Ver [docs/API.md](docs/API.md) para todos los detalles.

## 📝 Licencia

MIT © 2025 Andrés Felipe León Sánchez
```

---

## 📋 PASO 5: Crear tests para FASE 1

### M. Archivo: `tests/unit/computed.spec.ts`
```typescript
import { signal } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { computedMap, computedFilter, computedReduce } from '../../src/lib/computed';

describe('Computed Utilities', () => {
  describe('computedMap', () => {
    it('should transform array elements', () => {
      const items = signal([1, 2, 3]);
      const doubled = computedMap(items, x => x * 2);

      expect(doubled()).toEqual([2, 4, 6]);
    });

    it('should react to signal changes', () => {
      const items = signal([1, 2, 3]);
      const doubled = computedMap(items, x => x * 2);

      items.set([4, 5, 6]);
      expect(doubled()).toEqual([8, 10, 12]);
    });

    it('should handle empty arrays', () => {
      const items = signal<number[]>([]);
      const doubled = computedMap(items, x => x * 2);

      expect(doubled()).toEqual([]);
    });
  });

  describe('computedFilter', () => {
    it('should filter array based on predicate', () => {
      const items = signal([1, 2, 3, 4, 5]);
      const evens = computedFilter(items, x => x % 2 === 0);

      expect(evens()).toEqual([2, 4]);
    });

    it('should react to signal changes', () => {
      const items = signal([1, 2, 3]);
      const gt2 = computedFilter(items, x => x > 2);

      expect(gt2()).toEqual([3]);

      items.set([5, 6, 7]);
      expect(gt2()).toEqual([5, 6, 7]);
    });
  });

  describe('computedReduce', () => {
    it('should reduce array to single value', () => {
      const items = signal([1, 2, 3, 4]);
      const sum = computedReduce(items, (acc, val) => acc + val, 0);

      expect(sum()).toBe(10);
    });

    it('should work with different types', () => {
      const items = signal(['a', 'b', 'c']);
      const concatenated = computedReduce(items, (acc, val) => acc + val, '');

      expect(concatenated()).toBe('abc');
    });
  });
});
```

### N. Archivo: `tests/unit/storage.spec.ts`
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signalStorage } from '../../src/lib/storage';

describe('Signal Storage', () => {
  const testKey = 'test-key';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with initial value', () => {
    const state = signalStorage(testKey, 'initial');
    expect(state()).toBe('initial');
  });

  it('should sync to localStorage on change', () => {
    const state = signalStorage(testKey, 'initial');
    state.set('updated');

    expect(localStorage.getItem(testKey)).toBe(JSON.stringify('updated'));
  });

  it('should restore from localStorage on init', () => {
    localStorage.setItem(testKey, JSON.stringify('stored'));
    const state = signalStorage(testKey, 'initial');

    expect(state()).toBe('stored');
  });

  it('should handle objects', () => {
    const obj = { name: 'test', value: 42 };
    const state = signalStorage(testKey, obj);

    state.set({ name: 'updated', value: 100 });
    expect(localStorage.getItem(testKey)).toBe(JSON.stringify({ name: 'updated', value: 100 }));
  });
});
```

---

## 📋 PASO 6: Crear archivos de config adicionales

### O. Archivo: `.gitignore`
```
node_modules/
dist/
.DS_Store
*.log
npm-debug.log*
.env
.env.local
.vscode/*
!.vscode/extensions.json
.idea/
*.swp
*.swo
coverage/
.nyc_output/
```

### P. Archivo: `.npmignore`
```
src/
tests/
docs/
.github/
vitest.config.ts
tsconfig.json
.gitignore
.eslintrc
.prettierrc
```

---

## ✅ CHECKLIST Final

Una vez hayas creado todos los archivos:

- [ ] Carpetas creadas (src/lib/*, tests/*, docs/*)
- [ ] Todos los archivos `.ts` creados
- [ ] LICENSE con tu nombre
- [ ] README con ejemplos
- [ ] Tests listos
- [ ] package.json, tsconfig.json, vitest.config.ts existentes

Luego ejecuta:

```bash
cd /home/claude/signals-toolkit
npm install
npm run test
```

Si todo pasa los tests ✅, estamos listos para FASE 2!

---

**¿Listo para crear todo esto en Claude Code?** 🚀
