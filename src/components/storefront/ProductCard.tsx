'use client';

import Link from 'next/link';
import { Product } from '@/lib/types';

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group block bg-surface rounded-lg overflow-hidden border border-border hover:border-accent transition-colors"
    >
      {/* Image placeholder */}
      <div className="aspect-square bg-surface-hover flex items-center justify-center text-muted text-4xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-surface to-surface-hover" />
        <span className="relative z-10">
          {product.category === 'band-tees' ? '👕' :
           product.category === 'accessories' ? '💀' :
           product.category === 'hoodies' ? '🧥' :
           product.category === 'collectibles' ? '🎭' :
           product.category === 'subscriptions' ? '📦' :
           product.category === 'bottoms' ? '👖' : '🛍️'}
        </span>
        {product.isSubscription && (
          <span className="absolute top-2 right-2 bg-accent text-white text-xs px-2 py-1 rounded-full z-10">
            Subscription
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-sm group-hover:text-accent transition-colors line-clamp-2">
          {product.name}
        </h3>
        <p className="mt-1 text-accent font-bold">
          ${product.price.toFixed(2)}
          {product.isSubscription && (
            <span className="text-muted text-xs font-normal">
              /{product.subscriptionInterval}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
