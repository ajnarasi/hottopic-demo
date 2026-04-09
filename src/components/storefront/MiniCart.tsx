'use client';

import { useCart } from '@/hooks/useCart';
import Link from 'next/link';
import ApplePayButton from '@/components/apple-pay/ApplePayButton';

export default function MiniCart({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const items = useCart((s) => s.items);
  const removeItem = useCart((s) => s.removeItem);
  const getSubtotal = useCart((s) => s.getSubtotal);

  if (!open) return null;

  const subtotal = getSubtotal();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-96 max-w-full bg-surface border-l border-border z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-lg">Your Cart</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-muted text-center py-8">Your cart is empty</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-3 bg-background rounded-lg p-3"
                >
                  <div className="w-16 h-16 bg-surface-hover rounded flex items-center justify-center text-2xl shrink-0">
                    {item.product.category === 'band-tees' ? '👕' : '🛍️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.product.name}
                    </p>
                    {item.selectedSize && (
                      <p className="text-xs text-muted">
                        Size: {item.selectedSize}
                      </p>
                    )}
                    <p className="text-sm text-accent font-bold mt-1">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-muted hover:text-accent text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-border space-y-3">
            <div className="flex justify-between font-bold">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            {/* Apple Pay Express in Mini-Cart */}
            <ApplePayButton
              placement="mini-cart"
              items={items.map((i) => ({
                label: i.product.name,
                amount: (i.product.price * i.quantity).toFixed(2),
              }))}
              total={subtotal}
            />

            <Link
              href="/cart"
              onClick={onClose}
              className="block w-full text-center bg-surface-hover hover:bg-border text-foreground py-3 rounded-lg font-medium transition-colors"
            >
              View Cart
            </Link>
            <Link
              href="/checkout"
              onClick={onClose}
              className="block w-full text-center bg-accent hover:bg-accent-hover text-white py-3 rounded-lg font-medium transition-colors"
            >
              Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
