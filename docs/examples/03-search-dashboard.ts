/**
 * Example 3: Search Dashboard
 *
 * Helpers used:
 * - debounceSignal        → wait for user to stop typing before searching
 * - computedAsync         → fetch results reactively when search changes
 * - distinctUntilChanged  → skip re-fetch if search term didn't really change
 * - throttleSignal        → limit how often scroll position updates
 * - signalStorage         → remember last search across sessions
 * - computedFilter        → filter results by category client-side
 * - computedMap           → highlight matching text in results
 */

import { Component, inject, Injector, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  debounceSignal,
  computedAsync,
  distinctUntilChanged,
  throttleSignal,
  signalStorage,
  computedFilter,
  computedMap,
} from '@signals-toolkit/core';

interface SearchResult {
  id: number;
  title: string;
  category: string;
  description: string;
  url: string;
}

// Simulated API call
async function searchAPI(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  await new Promise(r => setTimeout(r, 400)); // simulate network delay
  return [
    { id: 1, title: `Angular ${query} Guide`, category: 'docs', description: 'Official Angular documentation', url: '#' },
    { id: 2, title: `${query} Best Practices`, category: 'blog', description: 'Community article', url: '#' },
    { id: 3, title: `${query} Tutorial`, category: 'video', description: 'Step by step guide', url: '#' },
    { id: 4, title: `Advanced ${query}`, category: 'docs', description: 'Deep dive article', url: '#' },
  ];
}

@Component({
  selector: 'app-search-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard">

      <!-- Search bar -->
      <div class="search-bar">
        <input
          [ngModel]="inputValue()"
          (ngModelChange)="inputValue.set($event)"
          placeholder="Buscar..."
          [class.searching]="loading()"
        />
        @if (loading()) {
          <span class="spinner">🔄</span>
        }
      </div>

      <!-- Category filter -->
      <div class="categories">
        <button
          [class.active]="activeCategory() === 'all'"
          (click)="activeCategory.set('all')"
        >
          Todos
        </button>
        @for (cat of ['docs', 'blog', 'video']; track cat) {
          <button
            [class.active]="activeCategory() === cat"
            (click)="activeCategory.set(cat)"
          >
            {{ cat }}
          </button>
        }
      </div>

      <!-- Results -->
      <div class="results">
        @if (error()) {
          <div class="error">Error al buscar: {{ error()?.message }}</div>
        }

        @if (!loading() && filteredResults().length === 0 && debouncedSearch()) {
          <p class="empty">Sin resultados para "{{ debouncedSearch() }}"</p>
        }

        @for (result of highlightedResults(); track result.id) {
          <div class="result-card">
            <span class="category-badge">{{ result.category }}</span>
            <a [href]="result.url">
              <h3 [innerHTML]="result.highlightedTitle"></h3>
            </a>
            <p>{{ result.description }}</p>
          </div>
        }
      </div>

      <!-- Scroll position indicator (throttled) -->
      <div class="scroll-indicator">
        Scroll: {{ scrollY() }}px
      </div>

    </div>
  `,
})
export class SearchDashboardComponent {
  private injector = inject(Injector);

  // ─── Input state ──────────────────────────────────────────────────────────

  // Raw input value (updates on every keystroke)
  inputValue = signal('');

  // Debounced — only updates 400ms after user stops typing
  // Persisted so the last search is remembered on reload
  debouncedSearch = signalStorage('last-search', '');

  // Filter tabs
  activeCategory = signalStorage<string>('search-category', 'all');

  // Throttled scroll position — updates at most once every 100ms
  scrollY = throttleSignal(0, 100);

  constructor() {
    // Connect input to debounced search
    // (in a real app you'd use effect() here with injector)
    window.addEventListener('scroll', () => {
      this.scrollY.set(window.scrollY);
    });
  }

  // ─── Search signal ────────────────────────────────────────────────────────

  // Skip re-fetch if the trimmed search term is the same
  stableSearch = distinctUntilChanged(
    this.debouncedSearch,
    (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()
  );

  // Fetch results reactively when stableSearch changes
  searchResults = computedAsync(
    this.stableSearch,
    query => searchAPI(query),
    { initialValue: [], injector: this.injector }
  );

  loading = this.searchResults.loading;
  error = this.searchResults.error;

  // ─── Derived results ──────────────────────────────────────────────────────

  // Filter by selected category client-side (no extra API call)
  filteredResults = computedFilter(
    this.searchResults.value,
    result => this.activeCategory() === 'all' || result.category === this.activeCategory()
  );

  // Highlight the search term in titles
  highlightedResults = computedMap(
    this.filteredResults,
    result => ({
      ...result,
      highlightedTitle: result.title.replace(
        new RegExp(`(${this.stableSearch()})`, 'gi'),
        '<mark>$1</mark>'
      ),
    })
  );

  // ─── Actions ──────────────────────────────────────────────────────────────

  onInput(value: string): void {
    this.inputValue.set(value);
    // In real usage, debouncedSearch would be connected via effect()
    // Here we simulate the debounce manually for the example
    this.debouncedSearch.set(value);
  }
}
