import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { signalGroup } from '@signals-toolkit/core';

@Component({
  selector: 'app-form-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <h2>Signal Group</h2>
      <p class="subtitle">
        Uses <code>signalGroup</code>
        <br/>All fields are individual WritableSignals — reset and patch work across all at once.
      </p>

      <div class="row">
        <div class="field">
          <label>Name</label>
          <input type="text" [ngModel]="form.name()" (ngModelChange)="form.name.set($event)" />
        </div>
        <div class="field">
          <label>Age</label>
          <input type="number" [ngModel]="form.age()" (ngModelChange)="form.age.set(+$event)" />
        </div>
      </div>

      <div class="field">
        <label>Email</label>
        <input type="text" [ngModel]="form.email()" (ngModelChange)="form.email.set($event)" />
      </div>

      <div class="field">
        <label>Role</label>
        <select [ngModel]="form.role()" (ngModelChange)="form.role.set($event)">
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div class="actions">
        <button class="btn-secondary btn-sm" (click)="form.reset(); submitted.set(false)">
          Reset all
        </button>
        <button class="btn-secondary btn-sm" (click)="fillSample()">
          Fill sample data
        </button>
        <button class="btn-primary btn-sm" (click)="submit()" [disabled]="!isValid()">
          Submit
        </button>
      </div>

      @if (submitted()) {
        <div style="margin-top:0.75rem;padding:0.5rem 0.875rem;background:#14532d;border-radius:0.5rem;color:#4ade80;font-size:0.85rem">
          ✓ Form submitted successfully!
        </div>
      }

      <!-- Live snapshot -->
      <div class="snapshot-box">{{ prettySnapshot() }}</div>

      <div style="margin-top:0.5rem;font-size:0.75rem;color:#475569">
        ↑ Live snapshot of all signals — updates as you type
      </div>
    </div>
  `,
})
export class FormDemoComponent {
  form = signalGroup({
    name:  '',
    age:   0,
    email: '',
    role:  'viewer' as 'viewer' | 'editor' | 'admin',
  });

  submitted = signal(false);

  isValid = computed(() =>
    !!this.form.name() && !!this.form.email() && this.form.age() > 0
  );

  prettySnapshot = computed(() =>
    JSON.stringify(this.form.snapshot(), null, 2)
  );

  fillSample(): void {
    this.form.patch({
      name:  'Andrés Felipe León',
      age:   28,
      email: 'felipe@example.com',
      role:  'admin',
    });
    this.submitted.set(false);
  }

  submit(): void {
    if (!this.isValid()) return;
    this.submitted.set(true);
    setTimeout(() => this.submitted.set(false), 2500);
  }
}
