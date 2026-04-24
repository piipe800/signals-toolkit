import { signal } from '@angular/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Subject, of, throwError } from 'rxjs';
import { signalFromObservable } from '../../src/lib/async/from-observable';
import { toObservable } from '../../src/lib/async/to-observable';
import { debounceSignal } from '../../src/lib/async/debounce';
import { throttleSignal } from '../../src/lib/async/throttle';
import { distinctUntilChanged } from '../../src/lib/async/distinct-until-changed';
import { createSignalHarness } from '../../src/testing/test-harness';

describe('signalFromObservable', () => {
  it('should initialize with initial value', () => {
    const subject = new Subject<number>();
    const { value, destroy } = signalFromObservable(subject, 0);
    expect(value()).toBe(0);
    destroy();
  });

  it('should update value when observable emits', () => {
    const subject = new Subject<string>();
    const { value, destroy } = signalFromObservable(subject, '');

    subject.next('hello');
    expect(value()).toBe('hello');

    subject.next('world');
    expect(value()).toBe('world');

    destroy();
  });

  it('should set loading=false on first emission', () => {
    const subject = new Subject<number>();
    const { loading, destroy } = signalFromObservable(subject, 0);

    expect(loading()).toBe(true);
    subject.next(1);
    expect(loading()).toBe(false);
    destroy();
  });

  it('should capture synchronous observable', () => {
    const { value, loading, destroy } = signalFromObservable(of(1, 2, 3), 0);
    expect(value()).toBe(3);
    expect(loading()).toBe(false);
    destroy();
  });

  it('should capture error', () => {
    const { error, destroy } = signalFromObservable(throwError(() => new Error('fail')), 0);
    expect(error()?.message).toBe('fail');
    destroy();
  });

  it('should stop receiving values after destroy', () => {
    const subject = new Subject<number>();
    const { value, destroy } = signalFromObservable(subject, 0);

    subject.next(1);
    expect(value()).toBe(1);

    destroy();
    subject.next(99);
    expect(value()).toBe(1); // unchanged
  });
});

describe('toObservable', () => {
  it('should emit current signal value and complete without injector', () => {
    const src = signal(42);
    const values: number[] = [];
    let completed = false;

    toObservable(src).subscribe({
      next: v => values.push(v),
      complete: () => { completed = true; },
    });

    expect(values).toEqual([42]);
    expect(completed).toBe(true);
  });
});

describe('debounceSignal', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('should not apply set immediately', () => {
    const search = debounceSignal('', 500);
    search.set('hello');
    expect(search()).toBe('');
  });

  it('should apply after delay', () => {
    const search = debounceSignal('', 500);
    search.set('hello');
    vi.advanceTimersByTime(500);
    expect(search()).toBe('hello');
  });

  it('should reset timer on rapid sets', () => {
    const search = debounceSignal('', 500);

    search.set('a');
    vi.advanceTimersByTime(300);
    search.set('ab');
    vi.advanceTimersByTime(300);
    expect(search()).toBe(''); // still debouncing

    vi.advanceTimersByTime(200);
    expect(search()).toBe('ab'); // only last value applied
  });

  it('should emit immediately with leading=true', () => {
    const search = debounceSignal('', { delay: 500, leading: true, trailing: false });
    search.set('hello');
    expect(search()).toBe('hello'); // immediate
  });

  it('should work via update()', () => {
    const count = debounceSignal(0, 300);
    count.update(n => n + 1);
    vi.advanceTimersByTime(300);
    expect(count()).toBe(1);
  });

  it('should accept numeric delay shorthand', () => {
    const s = debounceSignal('init', 100);
    s.set('done');
    vi.advanceTimersByTime(100);
    expect(s()).toBe('done');
  });
});

describe('throttleSignal', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('should emit first value immediately (leading)', () => {
    const scroll = throttleSignal(0, 100);
    scroll.set(50);
    expect(scroll()).toBe(50);
  });

  it('should throttle rapid sets', () => {
    const scroll = throttleSignal(0, 100);
    scroll.set(10);
    scroll.set(20);
    scroll.set(30);
    expect(scroll()).toBe(10); // only first leading emit
  });

  it('should emit trailing value after delay', () => {
    const scroll = throttleSignal(0, 100);
    scroll.set(10);
    scroll.set(99); // latest
    vi.advanceTimersByTime(100);
    expect(scroll()).toBe(99); // trailing emits last value
  });

  it('should allow new leading emit after window expires', () => {
    const scroll = throttleSignal(0, 100);
    scroll.set(1);
    vi.advanceTimersByTime(100);
    scroll.set(2);
    expect(scroll()).toBe(2); // new leading window
  });
});

describe('distinctUntilChanged', () => {
  it('should pass through distinct values', () => {
    const source = signal(1);
    const distinct = distinctUntilChanged(source);

    expect(distinct()).toBe(1);
    source.set(2);
    expect(distinct()).toBe(2);
  });

  it('should suppress equal consecutive values', () => {
    const source = signal(5);
    const distinct = distinctUntilChanged(source);

    expect(distinct()).toBe(5);
    source.set(5); // same value
    expect(distinct()).toBe(5);
  });

  it('should use custom equality function', () => {
    const source = signal({ id: 1, name: 'Alice' });
    const distinct = distinctUntilChanged(source, (a, b) => a.id === b.id);

    const firstRef = distinct();
    source.set({ id: 1, name: 'Changed' }); // same id
    expect(distinct()).toBe(firstRef); // same reference returned

    source.set({ id: 2, name: 'Bob' }); // different id
    expect(distinct().id).toBe(2);
  });

  it('should work with string values', () => {
    const source = signal('hello');
    const distinct = distinctUntilChanged(source);

    expect(distinct()).toBe('hello');
    source.set('hello'); // no change
    source.set('world');
    expect(distinct()).toBe('world');
  });
});

describe('createSignalHarness', () => {
  it('should initialize with given value', () => {
    const { read, history } = createSignalHarness(0);
    expect(read()).toBe(0);
    expect(history()).toEqual([0]);
  });

  it('should track all set values in history', () => {
    const { signal: s, read, history } = createSignalHarness('');
    s.set('a');
    s.set('b');
    s.set('c');
    expect(read()).toBe('c');
    expect(history()).toEqual(['', 'a', 'b', 'c']);
  });

  it('should track update() calls', () => {
    const { signal: s, history } = createSignalHarness(10);
    s.update(n => n * 2);
    expect(history()).toEqual([10, 20]);
  });

  it('should return readonly signal', () => {
    const { signal: s } = createSignalHarness(42);
    const ro = s.asReadonly();
    expect(ro()).toBe(42);
  });
});
