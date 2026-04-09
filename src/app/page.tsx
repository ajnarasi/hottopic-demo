import { products } from '@/lib/mock-data';
import ProductCard from '@/components/storefront/ProductCard';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Promo Banner */}
      <div className="mb-6 bg-gradient-to-r from-pink-100 via-blue-50 to-purple-100 rounded-lg p-6 text-center">
        <h2 className="text-2xl font-black text-foreground mb-1">
          Sanrio Character Ranking 2026
        </h2>
        <p className="text-sm text-muted">
          Vote for your favorite character! New collection available now.
        </p>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
