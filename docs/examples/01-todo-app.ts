/**
 * Example 1: Todo App
 *
 * Helpers used:
 * - signalStorage   → persist todos across page reloads
 * - computedFilter  → separate active vs completed todos
 * - computedReduce  → count pending todos
 * - computedMap     → transform todos for display
 */

import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  signalStorage,
  computedFilter,
  computedReduce,
  computedMap,
} from '@signals-toolkit/core';

interface Todo {
  id: number;
  text: string;
  done: boolean;
  createdAt: number;
}

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="todo-app">
      <h1>Tareas ({{ pending() }} pendientes)</h1>

      <!-- Add new todo -->
      <div class="add-todo">
        <input
          [(ngModel)]="newText"
          placeholder="Nueva tarea..."
          (keyup.enter)="addTodo()"
        />
        <button (click)="addTodo()" [disabled]="!newText().trim()">
          Agregar
        </button>
      </div>

      <!-- Filter tabs -->
      <div class="tabs">
        <button
          [class.active]="filter() === 'all'"
          (click)="filter.set('all')"
        >
          Todas ({{ todos().length }})
        </button>
        <button
          [class.active]="filter() === 'active'"
          (click)="filter.set('active')"
        >
          Activas ({{ activeTodos().length }})
        </button>
        <button
          [class.active]="filter() === 'done'"
          (click)="filter.set('done')"
        >
          Completadas ({{ completedTodos().length }})
        </button>
      </div>

      <!-- Todo list -->
      <ul>
        @for (todo of visibleTodos(); track todo.id) {
          <li [class.done]="todo.done">
            <input
              type="checkbox"
              [checked]="todo.done"
              (change)="toggleTodo(todo.id)"
            />
            <span>{{ todo.text }}</span>
            <small>{{ todo.dateLabel }}</small>
            <button (click)="removeTodo(todo.id)">✕</button>
          </li>
        }
      </ul>

      <!-- Summary -->
      @if (completedTodos().length > 0) {
        <div class="summary">
          <span>Total completadas: {{ completedTodos().length }}</span>
          <button (click)="clearCompleted()">Limpiar completadas</button>
        </div>
      }
    </div>
  `,
})
export class TodoAppComponent {
  // ─── State ───────────────────────────────────────────────────────────────

  // Persisted in localStorage — survives page reloads
  todos = signalStorage<Todo[]>('todos', []);
  filter = signalStorage<'all' | 'active' | 'done'>('todo-filter', 'all');
  newText = signal('');

  // ─── Derived signals ─────────────────────────────────────────────────────

  activeTodos = computedFilter(this.todos, t => !t.done);
  completedTodos = computedFilter(this.todos, t => t.done);

  // Count pending todos for the title
  pending = computedReduce(this.todos, (count, t) => count + (t.done ? 0 : 1), 0);

  // Add a formatted date label to each todo for display
  visibleTodosRaw = computed(() => {
    const f = this.filter();
    if (f === 'active') return this.activeTodos();
    if (f === 'done') return this.completedTodos();
    return this.todos();
  });

  visibleTodos = computedMap(
    this.visibleTodosRaw,
    todo => ({
      ...todo,
      dateLabel: new Date(todo.createdAt).toLocaleDateString(),
    })
  );

  // ─── Actions ─────────────────────────────────────────────────────────────

  addTodo(): void {
    const text = this.newText().trim();
    if (!text) return;

    this.todos.update(list => [
      ...list,
      { id: Date.now(), text, done: false, createdAt: Date.now() },
    ]);
    this.newText.set('');
  }

  toggleTodo(id: number): void {
    this.todos.update(list =>
      list.map(t => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  removeTodo(id: number): void {
    this.todos.update(list => list.filter(t => t.id !== id));
  }

  clearCompleted(): void {
    this.todos.update(list => list.filter(t => !t.done));
  }
}
