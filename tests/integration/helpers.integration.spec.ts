/**
 * Integration tests — multiple helpers working together.
 * Tests realistic usage patterns rather than isolated units.
 */

import { signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computedMap,
  computedFilter,
  computedReduce,
  signalStorage,
  signalFromObservable,
  debounceSignal,
  distinctUntilChanged,
  signalGroup,
  persistedComputed,
} from '../../src/index';

// ─── Scenario 1: Todo app state ───────────────────────────────────────────────
// signalStorage + computedFilter + computedReduce + computedMap

describe('Todo app — signalStorage + computed helpers', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  interface Todo { id: number; text: string; done: boolean; priority: number; }

  it('persists todos and derives filtered/reduced state correctly', () => {
    const todos = signalStorage<Todo[]>('todos', []);

    const active    = computedFilter(todos, t => !t.done);
    const done      = computedFilter(todos, t => t.done);
    const pending   = computedReduce(todos, (n, t) => n + (t.done ? 0 : 1), 0);
    const withLabel = computedMap(active, t => ({ ...t, label: `[P${t.priority}] ${t.text}` }));

    todos.set([
      { id: 1, text: 'Buy milk',  done: false, priority: 2 },
      { id: 2, text: 'Write code', done: true, priority: 1 },
      { id: 3, text: 'Exercise',  done: false, priority: 3 },
    ]);

    expect(active()).toHaveLength(2);
    expect(done()).toHaveLength(1);
    expect(pending()).toBe(2);
    expect(withLabel()[0].label).toBe('[P2] Buy milk');

    // Simulate page reload — restore from localStorage
    const restored = signalStorage<Todo[]>('todos', []);
    expect(restored()).toHaveLength(3);
    expect(computedFilter(restored, t => !t.done)()).toHaveLength(2);
  });

  it('update() propagates through all derived computeds', () => {
    const todos = signalStorage<Todo[]>('todos', [
      { id: 1, text: 'Task', done: false, priority: 1 },
    ]);

    const pending = computedReduce(todos, (n, t) => n + (t.done ? 0 : 1), 0);
    expect(pending()).toBe(1);

    todos.update(list => list.map(t => ({ ...t, done: true })));
    expect(pending()).toBe(0);
  });
});

// ─── Scenario 2: Search pipeline ─────────────────────────────────────────────
// debounceSignal + distinctUntilChanged + computedFilter

describe('Search pipeline — debounceSignal + distinctUntilChanged + computedFilter', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('filters list only after debounce fires and value is distinct', () => {
    const items = signal(['apple', 'banana', 'apricot', 'blueberry', 'avocado']);
    const input = debounceSignal('', 500);
    const stable = distinctUntilChanged(input);

    const results = computedFilter(
      items,
      item => stable() === '' || item.startsWith(stable())
    );

    // Rapid typing
    input.set('a');
    input.set('ap');
    input.set('app');

    // Before debounce fires — stable is still ''
    expect(stable()).toBe('');
    expect(results()).toHaveLength(5); // no filter yet

    vi.advanceTimersByTime(500);

    // After debounce — stable is 'app'
    expect(stable()).toBe('app');
    expect(results()).toEqual(['apple']);

    // Set same value — distinctUntilChanged suppresses
    const ref = stable();
    input.set('app');
    vi.advanceTimersByTime(500);
    expect(stable()).toBe(ref); // same reference
  });
});

// ─── Scenario 3: Observable data + computed transform ────────────────────────
// signalFromObservable + computedMap + computedReduce

describe('Observable data — signalFromObservable + computed helpers', () => {
  interface Order { id: number; amount: number; status: 'pending' | 'paid'; }

  it('bridges Observable to signals and derives totals', () => {
    const orders$ = new Subject<Order[]>();
    const { value: orders, loading, destroy } = signalFromObservable<Order[]>(orders$, []);

    const paid    = computedFilter(orders, o => o.status === 'paid');
    const totals  = computedMap(paid, o => ({ ...o, tax: o.amount * 0.19 }));
    const revenue = computedReduce(totals, (sum, o) => sum + o.amount, 0);

    expect(loading()).toBe(true);
    expect(revenue()).toBe(0);

    orders$.next([
      { id: 1, amount: 100, status: 'paid'    },
      { id: 2, amount: 200, status: 'pending' },
      { id: 3, amount: 150, status: 'paid'    },
    ]);

    expect(loading()).toBe(false);
    expect(paid()).toHaveLength(2);
    expect(revenue()).toBe(250);
    expect(totals()[0].tax).toBe(19);

    destroy();
  });

  it('stops updating after destroy()', () => {
    const subject = new Subject<number[]>();
    const { value, destroy } = signalFromObservable<number[]>(subject, []);
    const sum = computedReduce(value, (s, n) => s + n, 0);

    subject.next([1, 2, 3]);
    expect(sum()).toBe(6);

    destroy();
    subject.next([10, 20, 30]);
    expect(sum()).toBe(6); // unchanged after destroy
  });
});

// ─── Scenario 4: signalGroup + persistedComputed ─────────────────────────────

describe('signalGroup + persistedComputed', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('persists a computed value derived from a signal group', () => {
    const cart = signalGroup({
      items: [] as { name: string; price: number }[],
      discount: 0,
    });

    const total = persistedComputed('cart-total', () => {
      const subtotal = cart.items().reduce((sum, i) => sum + i.price, 0);
      return subtotal - cart.discount();
    });

    cart.patch({
      items: [{ name: 'Keyboard', price: 120 }, { name: 'Mouse', price: 45 }],
      discount: 10,
    });

    expect(total()).toBe(155);

    // Verify persisted
    const raw = localStorage.getItem('__psc__cart-total');
    expect(raw).not.toBeNull();
    expect(JSON.parse(JSON.parse(raw!).v)).toBe(155);

    // reset group — total recomputes
    cart.reset();
    expect(total()).toBe(0);
  });

  it('signalGroup snapshot reflects independent signal changes', () => {
    const settings = signalGroup({ theme: 'light', lang: 'en', fontSize: 14 });

    settings.theme.set('dark');
    settings.fontSize.update(s => s + 2);

    const snap = settings.snapshot();
    expect(snap).toEqual({ theme: 'dark', lang: 'en', fontSize: 16 });

    // Derived computed works across group signals
    const isLarge = computed(() => settings.fontSize() >= 16);
    expect(isLarge()).toBe(true);
  });
});
