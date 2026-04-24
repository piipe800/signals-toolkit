/* eslint-disable no-console */

export interface ProfilerEntry {
  name: string;
  duration: number;
  timestamp: number;
}

export interface SignalProfiler {
  start(name: string): void;
  stop(name: string): number;
  report(): void;
  getEntries(): readonly ProfilerEntry[];
  clear(): void;
}

/**
 * Lightweight performance profiler for measuring signal computation costs.
 *
 * @example
 * ```typescript
 * const profiler = signalProfiler();
 * profiler.start('userList');
 * const users = computedMap(userSignal, transformUser);
 * users(); // trigger computation
 * profiler.stop('userList');
 * profiler.report(); // prints timing to console
 * ```
 */
export function signalProfiler(): SignalProfiler {
  const entries: ProfilerEntry[] = [];
  const timers = new Map<string, number>();

  return {
    start(name: string): void {
      timers.set(name, performance.now());
    },

    stop(name: string): number {
      const start = timers.get(name);
      if (start === undefined) return 0;
      const duration = performance.now() - start;
      timers.delete(name);
      entries.push({ name, duration, timestamp: Date.now() });
      return duration;
    },

    report(): void {
      entries.forEach(e => {
        console.log(`[signals-profiler] ${e.name}: ${e.duration.toFixed(2)}ms`);
      });
    },

    getEntries(): readonly ProfilerEntry[] {
      return [...entries];
    },

    clear(): void {
      entries.length = 0;
      timers.clear();
    },
  };
}
