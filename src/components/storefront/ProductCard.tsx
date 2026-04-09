'use client';

import Link from 'next/link';
import { Product } from '@/lib/types';

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group bg-white border border-border rounded overflow-hidden">
      <Link href={`/products/${product.id}`}>
        {/* Product Image */}
        <div className="aspect-[3/4] bg-surface relative overflow-hidden">
          {product.image && product.image.startsWith('http') ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-surface-hover text-6xl">
              {product.category === 'band-tees' ? '👕' :
               product.category === 'accessories' ? '💀' :
               product.category === 'hoodies' ? '🧥' :
               product.category === 'collectibles' ? '🎭' :
               product.category === 'subscriptions' ? '📦' :
               product.category === 'bottoms' ? '👖' : '🛍️'}
            </div>
          )}
          {product.isSubscription && (
            <span className="absolute top-2 left-2 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded">
              SUBSCRIPTION
            </span>
          )}
        </div>
      </Link>

      {/* ADD TO BAG button */}
      <Link
        href={`/products/${product.id}`}
        className="block w-full bg-surface-hover text-foreground text-xs font-bold tracking-wide text-center py-2.5 hover:bg-black hover:text-white transition-colors uppercase"
      >
        ADD TO BAG
      </Link>

      {/* Product Info */}
      <div className="p-3">
        <Link href={`/products/${product.id}`}>
          <h3 className="text-xs font-medium text-foreground line-clamp-2 leading-snug group-hover:text-accent transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="mt-1 text-sm font-bold text-foreground">
          ${product.price.toFixed(2)}
          {product.isSubscription && (
            <span className="text-muted text-xs font-normal ml-1">
              /{product.subscriptionInterval}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
