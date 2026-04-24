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
    expect(localStorage.getItem(testKey)).toBe(
      JSON.stringify({ name: 'updated', value: 100 })
    );
  });

  it('should persist initial value to storage', () => {
    signalStorage(testKey, 'hello');
    expect(localStorage.getItem(testKey)).toBe(JSON.stringify('hello'));
  });

  it('should update signal value on set', () => {
    const state = signalStorage(testKey, 0);
    state.set(42);
    expect(state()).toBe(42);
  });

  it('should update via update() method', () => {
    const state = signalStorage(testKey, 10);
    state.update(n => n + 5);

    expect(state()).toBe(15);
    expect(localStorage.getItem(testKey)).toBe(JSON.stringify(15));
  });
});
