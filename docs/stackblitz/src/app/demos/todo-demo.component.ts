import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  signalStorage,
  computedFilter,
  computedReduce,
} from '@signals-toolkit/core';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

type Filter = 'all' | 'active' | 'done';

@Component({
  selector: 'app-todo-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <h2>Todo App</h2>
      <p class="subtitle">
        Uses <code>signalStorage</code> · <code>computedFilter</code> · <code>computedReduce</code>
        <br/>Reload the page — your todos survive! 💾
      </p>

      <!-- Add todo -->
      <div class="todo-input-row">
        <input
          type="text"
          [(ngModel)]="newText"
          placeholder="Add a new task..."
          (keyup.enter)="add()"
        />
        <button class="btn-primary" (click)="add()" [disabled]="!newText.trim()">
          Add
        </button>
      </div>

      <!-- Filters -->
      <div class="filter-tabs">
        @for (f of filters; track f.id) {
          <button [class.active]="filter() === f.id" (click)="filter.set(f.id)">
            {{ f.label }}
          </button>
        }
      </div>

      <!-- List -->
      <div class="todo-list">
        @for (todo of visible(); track todo.id) {
          <div class="todo-item" [class.done]="todo.done">
            <input type="checkbox" [checked]="todo.done" (change)="toggle(todo.id)" />
            <span>{{ todo.text }}</span>
            <button class="del" (click)="remove(todo.id)">✕</button>
          </div>
        } @empty {
          <div class="empty-state">No tasks here.</div>
        }
      </div>

      <!-- Stats -->
      <div class="stats">
        <span>Total: <strong>{{ todos().length }}</strong></span>
        <span>Pending: <strong>{{ pending() }}</strong></span>
        <span>Done: <strong>{{ done().length }}</strong></span>
        @if (done().length) {
          <button class="btn-sm btn-danger" style="margin-left:auto" (click)="clearDone()">
            Clear done
          </button>
        }
      </div>
    </div>
  `,
})
export class TodoDemoComponent {
  newText = '';
  filter = signal<Filter>('all');

  // Persisted in localStorage — survives page reloads
  todos = signalStorage<Todo[]>('demo-todos', []);

  active = computedFilter(this.todos, t => !t.done);
  done   = computedFilter(this.todos, t => t.done);
  pending = computedReduce(this.todos, (n, t) => n + (t.done ? 0 : 1), 0);

  filters = [
    { id: 'all'    as Filter, label: `All (${this.todos().length})` },
    { id: 'active' as Filter, label: 'Active' },
    { id: 'done'   as Filter, label: 'Done' },
  ];

  visible() {
    const f = this.filter();
    if (f === 'active') return this.active();
    if (f === 'done')   return this.done();
    return this.todos();
  }

  add(): void {
    if (!this.newText.trim()) return;
    this.todos.update(list => [
      ...list,
      { id: Date.now(), text: this.newText.trim(), done: false },
    ]);
    this.newText = '';
  }

  toggle(id: number): void {
    this.todos.update(list =>
      list.map(t => t.id === id ? { ...t, done: !t.done } : t)
    );
  }

  remove(id: number): void {
    this.todos.update(list => list.filter(t => t.id !== id));
  }

  clearDone(): void {
    this.todos.update(list => list.filter(t => !t.done));
  }
}
