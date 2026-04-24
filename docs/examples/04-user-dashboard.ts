/**
 * Example 4: User Dashboard
 *
 * Helpers used:
 * - computedAsync   → load user data reactively when selected user changes
 * - watchSignal     → apply side effects when theme changes (DOM, analytics)
 * - signalStorage   → persist theme, language, and selected user
 * - signalProfiler  → measure how long data loading takes
 * - computedMap     → transform user activity for display
 * - computedReduce  → calculate user stats summary
 */

import { Component, inject, Injector, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  computedAsync,
  watchSignal,
  signalStorage,
  signalProfiler,
  computedMap,
  computedReduce,
  WatchRef,
} from '@signals-toolkit/core';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface ActivityEntry {
  action: string;
  timestamp: number;
  points: number;
}

// Simulated API
async function loadUser(id: number): Promise<User> {
  await new Promise(r => setTimeout(r, 300));
  const users: Record<number, User> = {
    1: { id: 1, name: 'Felipe León', email: 'felipe@example.com', role: 'admin' },
    2: { id: 2, name: 'María García', email: 'maria@example.com', role: 'editor' },
    3: { id: 3, name: 'Carlos Ruiz', email: 'carlos@example.com', role: 'viewer' },
  };
  return users[id] ?? users[1];
}

async function loadActivity(userId: number): Promise<ActivityEntry[]> {
  await new Promise(r => setTimeout(r, 200));
  return [
    { action: 'Login', timestamp: Date.now() - 3600000, points: 5 },
    { action: 'Published article', timestamp: Date.now() - 7200000, points: 50 },
    { action: 'Left comment', timestamp: Date.now() - 10800000, points: 10 },
    { action: 'Shared post', timestamp: Date.now() - 14400000, points: 15 },
  ];
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard" [attr.data-theme]="theme()">

      <!-- Settings bar -->
      <header>
        <h1>Dashboard</h1>
        <div class="settings">
          <label>Tema:
            <select [value]="theme()" (change)="setTheme($event)">
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
              <option value="system">Sistema</option>
            </select>
          </label>
          <label>Idioma:
            <select [value]="language()" (change)="setLanguage($event)">
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
      </header>

      <!-- User selector -->
      <nav class="user-tabs">
        @for (id of [1, 2, 3]; track id) {
          <button
            [class.active]="selectedUserId() === id"
            (click)="selectedUserId.set(id)"
          >
            Usuario {{ id }}
          </button>
        }
      </nav>

      <!-- User profile -->
      @if (userState.loading()) {
        <div class="skeleton">Cargando usuario...</div>
      } @else if (userState.error()) {
        <div class="error">Error: {{ userState.error()?.message }}</div>
      } @else if (userState.value()) {
        <section class="profile">
          <h2>{{ userState.value()!.name }}</h2>
          <p>{{ userState.value()!.email }}</p>
          <span class="role">{{ userState.value()!.role }}</span>
        </section>
      }

      <!-- Activity feed -->
      @if (activityState.loading()) {
        <p>Cargando actividad...</p>
      } @else {
        <section class="activity">
          <h3>Actividad reciente</h3>
          <p class="total-points">
            Total de puntos: <strong>{{ totalPoints() }}</strong>
          </p>

          @for (entry of formattedActivity(); track entry.timestamp) {
            <div class="activity-entry">
              <span class="action">{{ entry.action }}</span>
              <span class="date">{{ entry.date }}</span>
              <span class="points">+{{ entry.points }} pts</span>
            </div>
          }
        </section>
      }

    </div>
  `,
})
export class UserDashboardComponent implements OnDestroy {
  private injector = inject(Injector);
  private profiler = signalProfiler();
  private themeWatcher: WatchRef;

  // ─── Persisted settings ───────────────────────────────────────────────────

  theme = signalStorage<'light' | 'dark' | 'system'>('theme', 'light');
  language = signalStorage<'es' | 'en'>('language', 'es');
  selectedUserId = signalStorage<number>('selected-user', 1);

  // ─── Async data ───────────────────────────────────────────────────────────

  userState = computedAsync(
    this.selectedUserId,
    async (id) => {
      this.profiler.start('loadUser');
      const user = await loadUser(id);
      this.profiler.stop('loadUser');
      return user;
    },
    { initialValue: null, injector: this.injector }
  );

  activityState = computedAsync(
    this.selectedUserId,
    userId => loadActivity(userId),
    { initialValue: [], injector: this.injector }
  );

  // ─── Derived activity signals ─────────────────────────────────────────────

  // Format timestamps for display
  formattedActivity = computedMap(
    this.activityState.value,
    entry => ({
      ...entry,
      date: new Date(entry.timestamp).toLocaleTimeString(),
    })
  );

  // Sum all activity points
  totalPoints = computedReduce(
    this.activityState.value,
    (sum, entry) => sum + entry.points,
    0
  );

  // ─── Side effects ─────────────────────────────────────────────────────────

  constructor() {
    // Apply theme to document and log analytics whenever it changes
    this.themeWatcher = watchSignal(this.theme, {
      onChange: (newTheme) => {
        document.documentElement.setAttribute('data-theme', newTheme);
        console.log('[analytics] theme_changed:', newTheme);
      },
      onError: (err) => {
        console.error('[theme] failed to apply:', err);
      },
      injector: this.injector,
    });
  }

  ngOnDestroy(): void {
    this.themeWatcher.destroy();
    this.profiler.report(); // Print timing summary on component destroy
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  setTheme(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'light' | 'dark' | 'system';
    this.theme.set(value);
  }

  setLanguage(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'es' | 'en';
    this.language.set(value);
  }
}
