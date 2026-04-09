'use client';

import { useCart } from '@/hooks/useCart';
import Link from 'next/link';
import ApplePayButton from '@/components/apple-pay/ApplePayButton';

export default function CartPage() {
  const items = useCart((s) => s.items);
  const removeItem = useCart((s) => s.removeItem);
  const updateQuantity = useCart((s) => s.updateQuantity);
  const getSubtotal = useCart((s) => s.getSubtotal);

  const subtotal = getSubtotal();
  const freeShipping = subtotal >= 50;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted text-lg mb-4">Your cart is empty</p>
          <Link
            href="/"
            className="text-accent hover:underline"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="md:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex gap-4 bg-surface rounded-lg p-4 border border-border"
              >
                <div className="w-24 h-24 bg-surface-hover rounded-lg flex items-center justify-center text-4xl shrink-0">
                  {item.product.category === 'band-tees'
                    ? '👕'
                    : item.product.category === 'accessories'
                    ? '💀'
                    : '🛍️'}
                </div>
                <div className="flex-1">
                  <Link
                    href={`/products/${item.product.id}`}
                    className="font-medium hover:text-accent transition-colors"
                  >
                    {item.product.name}
                  </Link>
                  {item.selectedSize && (
                    <p className="text-sm text-muted">
                      Size: {item.selectedSize}
                    </p>
                  )}
                  <p className="text-accent font-bold mt-1">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity - 1)
                      }
                      className="w-8 h-8 rounded border border-border bg-background hover:bg-surface-hover flex items-center justify-center text-sm"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity + 1)
                      }
                      className="w-8 h-8 rounded border border-border bg-background hover:bg-surface-hover flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="ml-auto text-sm text-muted hover:text-accent transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="bg-surface rounded-lg border border-border p-6 h-fit sticky top-20">
            <h2 className="font-bold text-lg mb-4">Order Summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Shipping</span>
                <span>
                  {freeShipping ? (
                    <span className="text-green-400">FREE</span>
                  ) : (
                    'Calculated at checkout'
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Tax</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-base">
                <span>Estimated Total</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Apple Pay Express */}
            <div className="mt-4 space-y-3">
              <ApplePayButton
                placement="cart"
                items={items.map((i) => ({
                  label: `${i.product.name} x${i.quantity}`,
                  amount: (i.product.price * i.quantity).toFixed(2),
                }))}
                total={subtotal}
              />

              <div className="text-center text-xs text-muted">or</div>

              <Link
                href="/checkout"
                className="block w-full text-center bg-accent hover:bg-accent-hover text-white py-3 rounded-lg font-medium transition-colors"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
