import { signal } from '@angular/core';
import { describe, it, expect, vi } from 'vitest';
import { watchSignal } from '../../src/lib/advanced/watch-signal';
import { computedAsync } from '../../src/lib/advanced/computed-async';
import { signalProfiler } from '../../src/lib/advanced/signal-profiler';

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
