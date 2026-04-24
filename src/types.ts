/**
 * Core type definitions for signals-toolkit
 */

export type SignalValue<T> = T;

export interface ComputedOptions {
  /** If true, the computed signal will track its dependencies */
  track?: boolean;
}

export interface StorageOptions {
  /**
   * Storage backend (localStorage or sessionStorage)
   * @default localStorage
   */
  storage?: Storage;
  /** Serializer function */
  serializer?: <T>(value: T) => string;
  /** Deserializer function */
  deserializer?: <T>(value: string) => T;
}

export interface DebounceOptions {
  /** Debounce delay in milliseconds */
  delay: number;
  /** If true, emit value on trailing edge @default true */
  trailing?: boolean;
  /** If true, emit value on leading edge @default false */
  leading?: boolean;
}

export interface ThrottleOptions {
  /** Throttle delay in milliseconds */
  delay: number;
  /** If true, emit value on trailing edge @default true */
  trailing?: boolean;
  /** If true, emit value on leading edge @default false */
  leading?: boolean;
}
