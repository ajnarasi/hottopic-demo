'use client';

import { useCart } from '@/hooks/useCart';
import { useUser } from '@/hooks/useUser';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import ApplePayButton from '@/components/apple-pay/ApplePayButton';
import Link from 'next/link';

function CheckoutContent() {
  const items = useCart((s) => s.items);
  const getSubtotal = useCart((s) => s.getSubtotal);
  const profile = useUser((s) => s.profile);
  const searchParams = useSearchParams();

  const status = searchParams.get('status');
  const orderId = searchParams.get('orderId');

  const [paymentMethod, setPaymentMethod] = useState<'apple-pay' | 'credit-card'>(
    profile.previousPaymentMethod === 'applePay' ? 'apple-pay' : 'credit-card'
  );

  const subtotal = getSubtotal();

  // Success state
  if (status === 'success') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
          ✓
        </div>
        <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-muted mb-2">
          Order ID: <span className="text-foreground font-mono">{orderId}</span>
        </p>
        <p className="text-muted mb-8">
          Payment processed via Apple Pay through Fiserv Commerce Hub.
        </p>

        <div className="bg-surface border border-border rounded-lg p-6 text-left mb-8">
          <h2 className="font-bold mb-3">Transaction Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Payment Method</span>
              <span>Apple Pay</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Processor</span>
              <span>Fiserv Commerce Hub</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Status</span>
              <span className="text-green-400">Approved</span>
            </div>
          </div>
          <p className="text-xs text-muted mt-4">
            Press Ctrl+Shift+D to view the full debug panel with raw API
            request/response data.
          </p>
        </div>

        <Link
          href="/"
          className="inline-block bg-accent hover:bg-accent-hover text-white px-8 py-3 rounded-lg font-medium transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted text-lg mb-4">Your cart is empty</p>
          <Link href="/" className="text-accent hover:underline">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="md:col-span-2 space-y-6">
            {/* Shipping Info */}
            <div className="bg-surface rounded-lg border border-border p-6">
              <h2 className="font-bold text-lg mb-4">Shipping Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    defaultValue={
                      profile.mode === 'returning'
                        ? profile.name?.split(' ')[0]
                        : ''
                    }
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    defaultValue={
                      profile.mode === 'returning'
                        ? profile.name?.split(' ').slice(1).join(' ')
                        : ''
                    }
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    placeholder="Last name"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-muted mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue={
                      profile.mode === 'returning' ? profile.email : ''
                    }
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    placeholder="Email address"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-muted mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    defaultValue={
                      profile.mode === 'returning'
                        ? profile.address?.addressLines[0]
                        : ''
                    }
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">City</label>
                  <input
                    type="text"
                    defaultValue={
                      profile.mode === 'returning'
                        ? profile.address?.locality
                        : ''
                    }
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    defaultValue={
                      profile.mode === 'returning'
                        ? profile.address?.administrativeArea
                        : ''
                    }
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    placeholder="State"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-surface rounded-lg border border-border p-6">
              <h2 className="font-bold text-lg mb-4">Payment Method</h2>

              {profile.mode === 'returning' &&
                profile.previousPaymentMethod === 'applePay' && (
                  <p className="text-sm text-green-400 mb-3">
                    Your last order used Apple Pay
                  </p>
                )}

              <div className="space-y-3">
                {/* Apple Pay Option */}
                <label
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    paymentMethod === 'apple-pay'
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'apple-pay'}
                    onChange={() => setPaymentMethod('apple-pay')}
                    className="accent-accent"
                  />
                  <span className="font-medium">Apple Pay</span>
                  {profile.mode === 'returning' && (
                    <span className="ml-auto text-xs bg-accent/20 text-accent px-2 py-1 rounded">
                      Saved
                    </span>
                  )}
                </label>

                {/* Credit Card Option */}
                <label
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    paymentMethod === 'credit-card'
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'credit-card'}
                    onChange={() => setPaymentMethod('credit-card')}
                    className="accent-accent"
                  />
                  <span className="font-medium">Credit Card</span>
                </label>
              </div>

              {/* Apple Pay Button (standard checkout — no shipping collection) */}
              {paymentMethod === 'apple-pay' && (
                <div className="mt-4">
                  <ApplePayButton
                    placement="checkout"
                    items={items.map((i) => ({
                      label: `${i.product.name} x${i.quantity}`,
                      amount: (i.product.price * i.quantity).toFixed(2),
                    }))}
                    total={subtotal}
                  />
                </div>
              )}

              {/* Credit Card Form (placeholder) */}
              {paymentMethod === 'credit-card' && (
                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    placeholder="Card number"
                    disabled
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                      placeholder="MM/YY"
                      disabled
                    />
                    <input
                      type="text"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                      placeholder="CVV"
                      disabled
                    />
                  </div>
                  <p className="text-xs text-muted">
                    Credit card form disabled in demo. Use Apple Pay.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-surface rounded-lg border border-border p-6 h-fit sticky top-20">
            <h2 className="font-bold text-lg mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex justify-between text-sm"
                >
                  <span className="text-muted">
                    {item.product.name} x{item.quantity}
                  </span>
                  <span>
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm border-t border-border pt-3">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Shipping</span>
                <span>
                  {subtotal >= 50 ? (
                    <span className="text-green-400">FREE</span>
                  ) : (
                    '$5.99'
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Tax</span>
                <span>TBD</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
