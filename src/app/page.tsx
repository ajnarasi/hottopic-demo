import { products } from '@/lib/mock-data';
import ProductCard from '@/components/storefront/ProductCard';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-accent">NEW</span> ARRIVALS
        </h1>
        <p className="text-muted">
          Shop the latest drops. Now with Apple Pay Express Checkout.
        </p>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
