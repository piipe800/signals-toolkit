/**
 * Example 2: Shopping Cart
 *
 * Helpers used:
 * - signalStorage  → persist cart across sessions
 * - computedMap    → calculate line totals per item
 * - computedReduce → cart total, item count, discount
 * - computedFilter → separate in-stock vs out-of-stock
 */

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  signalStorage,
  computedMap,
  computedReduce,
  computedFilter,
} from '@signals-toolkit/core';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

const PRODUCTS: Product[] = [
  { id: 1, name: 'Teclado mecánico', price: 120, stock: 5 },
  { id: 2, name: 'Mouse inalámbrico', price: 45, stock: 0 },
  { id: 3, name: 'Monitor 27"', price: 350, stock: 2 },
  { id: 4, name: 'Auriculares', price: 80, stock: 8 },
];

const DISCOUNT_THRESHOLD = 200;
const DISCOUNT_RATE = 0.1;

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="shop">

      <!-- Product catalog -->
      <section class="catalog">
        <h2>Productos disponibles</h2>

        @for (p of inStockProducts(); track p.id) {
          <div class="product-card">
            <h3>{{ p.name }}</h3>
            <p>$ {{ p.price }}</p>
            <small>Stock: {{ p.stock }}</small>
            <button (click)="addToCart(p)">Agregar al carrito</button>
          </div>
        }

        @if (outOfStockProducts().length > 0) {
          <div class="out-of-stock">
            <h3>Sin stock</h3>
            @for (p of outOfStockProducts(); track p.id) {
              <p>{{ p.name }} — agotado</p>
            }
          </div>
        }
      </section>

      <!-- Cart -->
      <section class="cart">
        <h2>Carrito ({{ itemCount() }} items)</h2>

        @if (cartLines().length === 0) {
          <p>El carrito está vacío.</p>
        }

        @for (line of cartLines(); track line.productId) {
          <div class="cart-line">
            <span>{{ line.name }}</span>
            <div class="qty">
              <button (click)="decreaseQty(line.productId)">-</button>
              <span>{{ line.quantity }}</span>
              <button (click)="increaseQty(line.productId)">+</button>
            </div>
            <span>$ {{ line.lineTotal }}</span>
            <button (click)="removeFromCart(line.productId)">✕</button>
          </div>
        }

        @if (cartLines().length > 0) {
          <div class="cart-summary">
            <p>Subtotal: $ {{ subtotal() }}</p>

            @if (hasDiscount()) {
              <p class="discount">
                Descuento (10%): -$ {{ discount() }}
              </p>
            } @else {
              <p class="hint">
                Agrega $ {{ amountToDiscount() }} más para obtener 10% de descuento
              </p>
            }

            <h3>Total: $ {{ total() }}</h3>
            <button class="checkout" (click)="checkout()">
              Finalizar compra
            </button>
            <button (click)="clearCart()">Vaciar carrito</button>
          </div>
        }
      </section>
    </div>
  `,
})
export class ShoppingCartComponent {
  // ─── State ───────────────────────────────────────────────────────────────

  products = signal<Product[]>(PRODUCTS);
  cart = signalStorage<CartItem[]>('shopping-cart', []);

  // ─── Product derived signals ──────────────────────────────────────────────

  inStockProducts = computedFilter(this.products, p => p.stock > 0);
  outOfStockProducts = computedFilter(this.products, p => p.stock === 0);

  // ─── Cart derived signals ─────────────────────────────────────────────────

  // Add line total to each cart item
  cartLines = computedMap(this.cart, item => ({
    ...item,
    lineTotal: item.price * item.quantity,
  }));

  // Total number of units in cart
  itemCount = computedReduce(this.cart, (sum, item) => sum + item.quantity, 0);

  // Raw subtotal
  subtotal = computedReduce(
    this.cartLines,
    (sum, line) => sum + line.lineTotal,
    0
  );

  hasDiscount = computedReduce(
    this.cartLines,
    (sum, line) => sum + line.lineTotal,
    0
  );

  // ─── Pricing computed ─────────────────────────────────────────────────────

  discount(): number {
    const sub = this.subtotal();
    return sub >= DISCOUNT_THRESHOLD ? Math.round(sub * DISCOUNT_RATE) : 0;
  }

  hasDiscount(): boolean {
    return this.subtotal() >= DISCOUNT_THRESHOLD;
  }

  total(): number {
    return this.subtotal() - this.discount();
  }

  amountToDiscount(): number {
    return Math.max(0, DISCOUNT_THRESHOLD - this.subtotal());
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  addToCart(product: Product): void {
    this.cart.update(items => {
      const existing = items.find(i => i.productId === product.id);
      if (existing) {
        return items.map(i =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...items, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      }];
    });
  }

  increaseQty(productId: number): void {
    this.cart.update(items =>
      items.map(i => i.productId === productId
        ? { ...i, quantity: i.quantity + 1 }
        : i
      )
    );
  }

  decreaseQty(productId: number): void {
    this.cart.update(items =>
      items
        .map(i => i.productId === productId
          ? { ...i, quantity: i.quantity - 1 }
          : i
        )
        .filter(i => i.quantity > 0)
    );
  }

  removeFromCart(productId: number): void {
    this.cart.update(items => items.filter(i => i.productId !== productId));
  }

  clearCart(): void {
    this.cart.set([]);
  }

  checkout(): void {
    alert(`Pedido realizado por $${this.total()}. ¡Gracias!`);
    this.clearCart();
  }
}
