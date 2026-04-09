'use client';

import { useParams, useRouter } from 'next/navigation';
import { getProduct } from '@/lib/mock-data';
import { useCart } from '@/hooks/useCart';
import { useState, use } from 'react';
import ApplePayButton from '@/components/apple-pay/ApplePayButton';
import Link from 'next/link';

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const product = getProduct(id);
  const addItem = useCart((s) => s.addItem);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <Link href="/" className="text-accent hover:underline">
          Back to Shop
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem(product, quantity, selectedSize || undefined, selectedColor || undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted mb-6">
        <Link href="/" className="hover:text-accent">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="aspect-square bg-surface rounded-lg flex items-center justify-center text-8xl border border-border">
          {product.category === 'band-tees'
            ? '👕'
            : product.category === 'accessories'
            ? '💀'
            : product.category === 'hoodies'
            ? '🧥'
            : product.category === 'collectibles'
            ? '🎭'
            : product.category === 'subscriptions'
            ? '📦'
            : product.category === 'bottoms'
            ? '👖'
            : '🛍️'}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          <p className="text-2xl text-accent font-bold mb-4">
            ${product.price.toFixed(2)}
            {product.isSubscription && (
              <span className="text-muted text-base font-normal">
                /{product.subscriptionInterval}
              </span>
            )}
          </p>
          <p className="text-muted mb-6">{product.description}</p>

          {/* Size Selector */}
          {product.sizes && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Size</label>
              <div className="flex gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 rounded border text-sm transition-colors ${
                      selectedSize === size
                        ? 'border-accent bg-accent text-white'
                        : 'border-border bg-surface hover:border-accent'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Selector */}
          {product.colors && product.colors.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`px-4 py-2 rounded border text-sm transition-colors ${
                      selectedColor === color
                        ? 'border-accent bg-accent text-white'
                        : 'border-border bg-surface hover:border-accent'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded border border-border bg-surface hover:bg-surface-hover flex items-center justify-center"
              >
                -
              </button>
              <span className="w-10 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded border border-border bg-surface hover:bg-surface-hover flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to Cart */}
          <button
            onClick={handleAddToCart}
            className="w-full bg-accent hover:bg-accent-hover text-white py-3 rounded-lg font-medium transition-colors mb-3"
          >
            {added ? 'Added to Cart!' : 'Add to Cart'}
          </button>

          {/* Apple Pay Express Checkout */}
          <ApplePayButton
            placement="pdp"
            items={[
              {
                label: product.name,
                amount: (product.price * quantity).toFixed(2),
              },
            ]}
            total={product.price * quantity}
            productId={product.id}
            isSubscription={product.isSubscription}
            subscriptionConfig={
              product.isSubscription
                ? {
                    billingDescription: `${product.name} - Monthly Subscription`,
                    amount: product.subscriptionAmount!.toFixed(2),
                    intervalUnit: 'month',
                    intervalCount: 1,
                  }
                : undefined
            }
            className="mb-3"
          />

          <p className="text-xs text-muted text-center">
            Express Checkout — skip the cart and pay instantly
          </p>
        </div>
      </div>
    </div>
  );
}
