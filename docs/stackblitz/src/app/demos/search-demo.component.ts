import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceSignal, distinctUntilChanged } from '@signals-toolkit/core';

interface LogEntry {
  ts: string;
  type: 'keystroke' | 'applied';
  value: string;
}

@Component({
  selector: 'app-search-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <h2>Debounce Search</h2>
      <p class="subtitle">
        Uses <code>debounceSignal</code> · <code>distinctUntilChanged</code>
        <br/>Type fast — the search only applies 600ms after you stop.
      </p>

      <!-- Input -->
      <div class="field">
        <label>Type something:</label>
        <input
          type="text"
          [ngModel]="rawInput()"
          (ngModelChange)="onInput($event)"
          placeholder="Start typing..."
        />
      </div>

      <!-- Status -->
      <div class="search-status">
        @if (!rawInput()) {
          <span class="badge badge-waiting">Waiting for input</span>
        } @else if (rawInput() !== applied()) {
          <span class="badge badge-debouncing">⏳ Debouncing...</span>
          <span style="color:#64748b;font-size:0.8rem">will apply in ~600ms</span>
        } @else {
          <span class="badge badge-applied">✓ Applied</span>
          <span style="color:#4ade80;font-size:0.8rem">"{{ applied() }}"</span>
        }
      </div>

      <!-- Counters -->
      <div class="stats" style="margin-top:0.75rem">
        <span>Keystrokes: <strong>{{ keystrokes() }}</strong></span>
        <span>API calls (simulated): <strong style="color:#4ade80">{{ apiCalls() }}</strong></span>
        <span>Saved: <strong style="color:#818cf8">{{ saved() }}</strong></span>
      </div>

      <!-- Log -->
      <div class="timeline" style="margin-top:0.875rem">
        @for (entry of log(); track entry.ts) {
          <div class="timeline-entry">
            <span class="ts">{{ entry.ts }}</span>
            @if (entry.type === 'keystroke') {
              <span>keystroke → <span class="val">"{{ entry.value }}"</span></span>
            } @else {
              <span style="color:#4ade80">✓ search applied → <span class="val">"{{ entry.value }}"</span></span>
            }
          </div>
        } @empty {
          <span>Events will appear here...</span>
        }
      </div>

      <div class="actions" style="margin-top:0.875rem">
        <button class="btn-secondary btn-sm" (click)="clear()">Clear</button>
      </div>
    </div>
  `,
})
export class SearchDemoComponent {
  rawInput = signal('');
  keystrokes = signal(0);
  apiCalls = signal(0);
  log = signal<LogEntry[]>([]);

  // 600ms debounce
  search = debounceSignal('', 600);

  // Skip re-render if same value (e.g. spaces trimmed to same string)
  applied = distinctUntilChanged(this.search);

  saved = computed(() => Math.max(0, this.keystrokes() - this.apiCalls()));

  onInput(value: string): void {
    this.rawInput.set(value);
    this.keystrokes.update(n => n + 1);
    this.addLog('keystroke', value);

    this.search.set(value);

    // Simulate: after debounce fires, search() changes → API call
    // We track this by comparing inside an interval (simplified for demo)
    const current = value;
    setTimeout(() => {
      if (this.search() === current && this.applied() === current) {
        const lastLog = this.log().at(-1);
        if (lastLog?.type !== 'applied' || lastLog?.value !== current) {
          this.apiCalls.update(n => n + 1);
          this.addLog('applied', current);
        }
      }
    }, 650);
  }

  addLog(type: 'keystroke' | 'applied', value: string): void {
    const ts = new Date().toLocaleTimeString('en', { hour12: false });
    this.log.update(entries => [{ ts, type, value }, ...entries].slice(0, 20));
  }

  clear(): void {
    this.rawInput.set('');
    this.search.set('');
    this.keystrokes.set(0);
    this.apiCalls.set(0);
    this.log.set([]);
  }
}
