import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  computedMap,
  computedFilter,
  computedReduce,
  signalStorage,
} from '@signals-toolkit/core';

interface Product { id: number; name: string; price: number; }
interface CartItem { productId: number; name: string; price: number; quantity: number; }

const PRODUCTS: Product[] = [
  { id: 1, name: 'Mechanical Keyboard', price: 120 },
  { id: 2, name: 'Wireless Mouse',      price: 45  },
  { id: 3, name: '27" Monitor',         price: 350 },
  { id: 4, name: 'Headphones',          price: 80  },
  { id: 5, name: 'USB-C Hub',           price: 35  },
];

@Component({
  selector: 'app-cart-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <h2>Shopping Cart</h2>
      <p class="subtitle">
        Uses <code>signalStorage</code> · <code>computedMap</code> · <code>computedFilter</code> · <code>computedReduce</code>
        <br/>Cart is persisted — reload the page and it stays! 🛒
      </p>

      <!-- Products -->
      <div class="product-grid">
        @for (p of products; track p.id) {
          <div class="product-card">
            <div class="info">
              <div class="name">{{ p.name }}</div>
              <div class="price">\${{ p.price }}</div>
            </div>
            <button class="btn-primary btn-sm" (click)="addToCart(p)">+</button>
          </div>
        }
      </div>

      <!-- Cart -->
      @if (cartLines().length === 0) {
        <div class="empty-state">Cart is empty — add some products above.</div>
      } @else {
        <div class="cart-items">
          @for (line of cartLines(); track line.productId) {
            <div class="cart-row">
              <span class="name">{{ line.name }}</span>
              <div class="qty-ctrl">
                <button (click)="decrease(line.productId)">−</button>
                <span>{{ line.quantity }}</span>
                <button (click)="increase(line.productId)">+</button>
              </div>
              <span class="line-total">\${{ line.lineTotal }}</span>
              <button class="del btn-sm" style="background:transparent;color:#475569" (click)="remove(line.productId)">✕</button>
            </div>
          }
        </div>

        <!-- Totals -->
        <div class="stats" style="margin-bottom:0.75rem">
          <span>Items: <strong>{{ itemCount() }}</strong></span>
          <span>Unique: <strong>{{ cartLines().length }}</strong></span>
          @if (hasDiscount()) {
            <span style="color:#4ade80">🏷️ 10% discount applied!</span>
          } @else {
            <span>Add \${{ toDiscount() }} more for 10% off</span>
          }
        </div>

        <div class="total-bar">
          <span class="label">
            @if (hasDiscount()) {
              <span style="text-decoration:line-through;color:#475569;margin-right:0.5rem">\${{ subtotal() }}</span>
            }
            Total
          </span>
          <span class="amount">\${{ total() }}</span>
        </div>

        <div class="actions" style="margin-top:0.75rem">
          <button class="btn-danger btn-sm" (click)="clear()">Clear cart</button>
        </div>
      }
    </div>
  `,
})
export class CartDemoComponent {
  products = PRODUCTS;

  // Persisted in localStorage
  cart = signalStorage<CartItem[]>('demo-cart', []);

  // Add computed line totals per item
  cartLines = computedMap(this.cart, item => ({
    ...item,
    lineTotal: item.price * item.quantity,
  }));

  // Total units
  itemCount = computedReduce(this.cart, (sum, item) => sum + item.quantity, 0);

  // Raw subtotal
  subtotal = computedReduce(this.cartLines, (sum, line) => sum + line.lineTotal, 0);

  hasDiscount = computed(() => this.subtotal() >= 200);
  discount    = computed(() => this.hasDiscount() ? Math.round(this.subtotal() * 0.1) : 0);
  total       = computed(() => this.subtotal() - this.discount());
  toDiscount  = computed(() => Math.max(0, 200 - this.subtotal()));

  addToCart(product: Product): void {
    this.cart.update(items => {
      const existing = items.find(i => i.productId === product.id);
      if (existing) {
        return items.map(i =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...items, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  }

  increase(id: number): void {
    this.cart.update(items =>
      items.map(i => i.productId === id ? { ...i, quantity: i.quantity + 1 } : i)
    );
  }

  decrease(id: number): void {
    this.cart.update(items =>
      items
        .map(i => i.productId === id ? { ...i, quantity: i.quantity - 1 } : i)
        .filter(i => i.quantity > 0)
    );
  }

  remove(id: number): void {
    this.cart.update(items => items.filter(i => i.productId !== id));
  }

  clear(): void {
    this.cart.set([]);
  }
}
