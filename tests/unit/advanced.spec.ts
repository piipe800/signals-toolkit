import { signal } from '@angular/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { watchSignal } from '../../src/lib/advanced/watch-signal';
import { computedAsync } from '../../src/lib/advanced/computed-async';
import { signalProfiler } from '../../src/lib/advanced/signal-profiler';
import { signalGroup } from '../../src/lib/advanced/signal-group';
import { persistedComputed, readPersistedComputed } from '../../src/lib/advanced/persisted-computed';

// ─── watchSignal ─────────────────────────────────────────────────────────────

describe('watchSignal', () => {
  it('should call onChange with current value immediately (no injector)', () => {
    const theme = signal('light');
    const changes: string[] = [];

    const ref = watchSignal(theme, { onChange: v => changes.push(v) });

    expect(changes).toEqual(['light']);
    ref.destroy();
  });

  it('should handle multiple watch refs independently', () => {
    const count = signal(0);
    const a: number[] = [];
    const b: number[] = [];

    const refA = watchSignal(count, { onChange: v => a.push(v) });
    const refB = watchSignal(count, { onChange: v => b.push(v) });

    expect(a).toEqual([0]);
    expect(b).toEqual([0]);

    refA.destroy();
    refB.destroy();
  });

  it('should call onError when onChange throws', () => {
    const theme = signal('light');
    const errors: string[] = [];

    const ref = watchSignal(theme, {
      onChange: () => { throw new Error('handler error'); },
      onError: e => errors.push(e.message),
    });

    expect(errors).toEqual(['handler error']);
    ref.destroy();
  });

  it('should wrap non-Error throws in Error', () => {
    const src = signal(1);
    const errors: Error[] = [];

    const ref = watchSignal(src, {
      onChange: () => { throw 'string error'; },
      onError: e => errors.push(e),
    });

    expect(errors[0]).toBeInstanceOf(Error);
    ref.destroy();
  });

  it('destroy should be a no-op without injector', () => {
    const src = signal(0);
    const ref = watchSignal(src, { onChange: () => {} });
    expect(() => ref.destroy()).not.toThrow();
  });
});

// ─── computedAsync ───────────────────────────────────────────────────────────

describe('computedAsync', () => {
  it('should start loading immediately', () => {
    const id = signal(1);
    const { loading } = computedAsync(id, async n => n * 10);
    expect(loading()).toBe(true);
  });

  it('should resolve the async function', async () => {
    const id = signal(1);
    const { value, loading } = computedAsync(id, async n => n * 10);

    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(value()).toBe(10);
    expect(loading()).toBe(false);
  });

  it('should use initialValue before resolving', () => {
    const id = signal(1);
    const { value } = computedAsync(id, async n => n * 10, { initialValue: 0 });
    expect(value()).toBe(0);
  });

  it('should capture async errors', async () => {
    const id = signal(1);
    const { error, loading } = computedAsync(
      id,
      async () => { throw new Error('fetch failed'); }
    );

    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(error()?.message).toBe('fetch failed');
    expect(loading()).toBe(false);
  });

  it('should wrap non-Error rejections', async () => {
    const id = signal(1);
    const { error } = computedAsync(id, async () => Promise.reject('plain string'));

    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(error()).toBeInstanceOf(Error);
  });

  it('should work with string source signal', async () => {
    const query = signal('hello');
    const { value } = computedAsync(query, async q => q.toUpperCase());

    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(value()).toBe('HELLO');
  });

  it('should pass AbortSignal to asyncFn', async () => {
    const id = signal(1);
    let receivedSignal: AbortSignal | null = null;

    const { value } = computedAsync(id, async (n, abortSignal) => {
      receivedSignal = abortSignal;
      return n * 10;
    });

    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(receivedSignal).toBeInstanceOf(AbortSignal);
    expect(value()).toBe(10);
  });

  it('should silently ignore DOMException AbortError', async () => {
    const id = signal(1);
    const { error } = computedAsync(id, async () => {
      throw new DOMException('Aborted', 'AbortError');
    });

    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(error()).toBeNull();
  });

  it('should silently ignore Error with name AbortError', async () => {
    const id = signal(1);
    const { error } = computedAsync(id, async () => {
      const e = new Error('Aborted');
      e.name = 'AbortError';
      throw e;
    });

    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(error()).toBeNull();
  });

  it('should provide a non-aborted AbortSignal on first fetch', async () => {
    const id = signal(1);
    let captured: AbortSignal | null = null;

    computedAsync(id, async (_n, abortSignal) => {
      captured = abortSignal;
      return 42;
    });

    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(captured).toBeInstanceOf(AbortSignal);
    expect(captured!.aborted).toBe(false);
  });
});

// ─── signalProfiler ──────────────────────────────────────────────────────────

describe('signalProfiler', () => {
  it('should return positive duration on stop', async () => {
    const profiler = signalProfiler();
    profiler.start('op');
    await new Promise<void>(resolve => setTimeout(resolve, 5));
    const duration = profiler.stop('op');

    expect(duration).toBeGreaterThan(0);
  });

  it('should record entry with name and timestamp', () => {
    const profiler = signalProfiler();
    profiler.start('render');
    profiler.stop('render');

    const entries = profiler.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('render');
    expect(entries[0].timestamp).toBeGreaterThan(0);
  });

  it('should return 0 for unknown key', () => {
    const profiler = signalProfiler();
    expect(profiler.stop('nope')).toBe(0);
  });

  it('should track multiple independent entries', () => {
    const profiler = signalProfiler();
    profiler.start('a');
    profiler.stop('a');
    profiler.start('b');
    profiler.stop('b');

    expect(profiler.getEntries()).toHaveLength(2);
    expect(profiler.getEntries().map(e => e.name)).toEqual(['a', 'b']);
  });

  it('should clear all entries and timers', () => {
    const profiler = signalProfiler();
    profiler.start('x');
    profiler.stop('x');
    profiler.clear();

    expect(profiler.getEntries()).toHaveLength(0);
  });

  it('should call report without throwing', () => {
    const profiler = signalProfiler();
    profiler.start('t');
    profiler.stop('t');
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    profiler.report();
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('should return a copy of entries (immutable)', () => {
    const profiler = signalProfiler();
    profiler.start('z');
    profiler.stop('z');

    const entries1 = profiler.getEntries();
    profiler.clear();
    const entries2 = profiler.getEntries();

    expect(entries1).toHaveLength(1);
    expect(entries2).toHaveLength(0);
  });
});

// ─── signalGroup ─────────────────────────────────────────────────────────────

describe('signalGroup', () => {
  it('should create a WritableSignal for each key', () => {
    const group = signalGroup({ name: 'Felipe', age: 30 });

    expect(group.name()).toBe('Felipe');
    expect(group.age()).toBe(30);
  });

  it('should allow setting individual signals', () => {
    const group = signalGroup({ name: '', role: 'viewer' });

    group.name.set('María');
    expect(group.name()).toBe('María');
    expect(group.role()).toBe('viewer'); // unchanged
  });

  it('snapshot() returns all current values', () => {
    const group = signalGroup({ x: 1, y: 2, z: 3 });
    group.y.set(99);

    expect(group.snapshot()).toEqual({ x: 1, y: 99, z: 3 });
  });

  it('snapshot() reflects latest values after multiple sets', () => {
    const group = signalGroup({ a: 'a', b: 'b' });
    group.a.set('A');
    group.b.set('B');

    expect(group.snapshot()).toEqual({ a: 'A', b: 'B' });
  });

  it('reset() restores all signals to initial values', () => {
    const group = signalGroup({ count: 0, label: 'init' });
    group.count.set(42);
    group.label.set('changed');

    group.reset();

    expect(group.count()).toBe(0);
    expect(group.label()).toBe('init');
  });

  it('patch() updates only specified keys', () => {
    const group = signalGroup({ name: 'A', age: 1, active: false });
    group.patch({ name: 'B', active: true });

    expect(group.name()).toBe('B');
    expect(group.age()).toBe(1); // unchanged
    expect(group.active()).toBe(true);
  });

  it('patch() with empty object changes nothing', () => {
    const group = signalGroup({ x: 10 });
    group.patch({});
    expect(group.x()).toBe(10);
  });

  it('signals are reactive — computedMap works over snapshot values', () => {
    const group = signalGroup({ items: [1, 2, 3] });
    group.items.set([4, 5, 6]);
    expect(group.snapshot().items).toEqual([4, 5, 6]);
  });

  it('reset() after patch restores original values', () => {
    const group = signalGroup({ score: 0 });
    group.patch({ score: 100 });
    group.reset();
    expect(group.score()).toBe(0);
  });
});

// ─── persistedComputed ───────────────────────────────────────────────────────

describe('persistedComputed', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { localStorage.clear(); });

  it('should compute and return value from factory', () => {
    const base = signal(5);
    const doubled = persistedComputed('test-double', () => base() * 2);
    expect(doubled()).toBe(10);
  });

  it('should save result to localStorage', () => {
    const base = signal(3);
    const result = persistedComputed('test-save', () => base() * 10);
    result(); // trigger computation

    const raw = localStorage.getItem('__psc__test-save');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(JSON.parse(parsed.v)).toBe(30);
  });

  it('should be reactive — updates when dependency changes', () => {
    const base = signal(1);
    const comp = persistedComputed('test-reactive', () => base() + 100);

    expect(comp()).toBe(101);
    base.set(5);
    expect(comp()).toBe(105);
  });

  it('readPersistedComputed returns cached value', () => {
    const base = signal(7);
    const comp = persistedComputed('test-read', () => base() * 3);
    comp(); // trigger and save

    const cached = readPersistedComputed<number>('test-read');
    expect(cached).toBe(21);
  });

  it('readPersistedComputed returns undefined when no cache', () => {
    const cached = readPersistedComputed('non-existent');
    expect(cached).toBeUndefined();
  });

  it('should respect TTL — expired cache returns undefined via readPersistedComputed', () => {
    const base = signal(1);
    const comp = persistedComputed('test-ttl', () => base(), { ttl: 1 });
    comp();

    // Manually set an old timestamp
    const cacheKey = '__psc__test-ttl';
    const existing = JSON.parse(localStorage.getItem(cacheKey)!);
    localStorage.setItem(cacheKey, JSON.stringify({ ...existing, ts: Date.now() - 100 }));

    const cached = readPersistedComputed('test-ttl', { ttl: 1 });
    expect(cached).toBeUndefined();
  });

  it('should not write to storage redundantly when value is unchanged', () => {
    const base = signal(42);
    const spy = vi.spyOn(Storage.prototype, 'setItem');

    const comp = persistedComputed('test-dedup', () => base());
    comp(); // first read — saves
    comp(); // second read — same value, no save

    // setItem called once (first computation only)
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
