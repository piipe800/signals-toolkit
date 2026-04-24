import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TodoDemoComponent } from './demos/todo-demo.component';
import { SearchDemoComponent } from './demos/search-demo.component';
import { FormDemoComponent } from './demos/form-demo.component';
import { CartDemoComponent } from './demos/cart-demo.component';

type Tab = 'todo' | 'search' | 'form' | 'cart';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, TodoDemoComponent, SearchDemoComponent, FormDemoComponent, CartDemoComponent],
  template: `
    <div class="shell">
      <div class="header">
        <h1><span>&#64;signals-toolkit</span>/core — Live Demo</h1>
        <p>Interactive examples of all helpers. Open the source files on the left to explore.</p>
      </div>

      <div class="tabs">
        @for (tab of tabs; track tab.id) {
          <button
            class="tab-btn"
            [class.active]="active() === tab.id"
            (click)="active.set(tab.id)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      @switch (active()) {
        @case ('todo')   { <app-todo-demo /> }
        @case ('search') { <app-search-demo /> }
        @case ('form')   { <app-form-demo /> }
        @case ('cart')   { <app-cart-demo /> }
      }
    </div>
  `,
})
export class AppComponent {
  active = signal<Tab>('todo');

  tabs: { id: Tab; label: string }[] = [
    { id: 'todo',   label: '✅ Todo App' },
    { id: 'search', label: '🔍 Debounce Search' },
    { id: 'form',   label: '📋 Signal Group' },
    { id: 'cart',   label: '🛒 Shopping Cart' },
  ];
}
