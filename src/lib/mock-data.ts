import { Product, ShippingMethod, UserProfile } from './types';

export const products: Product[] = [
  {
    id: 'metallica-ride-lightning',
    name: 'Metallica Ride The Lightning Tee',
    description: 'Official Metallica Ride The Lightning album artwork tee. 100% cotton, pre-shrunk.',
    price: 24.99,
    currency: 'USD',
    image: '/images/products/metallica-tee.jpg',
    category: 'band-tees',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Black'],
  },
  {
    id: 'nirvana-smiley-oversized',
    name: 'Nirvana Smiley Oversized Tee',
    description: 'Oversized fit Nirvana smiley face tee. Dropped shoulders, relaxed fit.',
    price: 29.99,
    currency: 'USD',
    image: '/images/products/nirvana-tee.jpg',
    category: 'band-tees',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Black', 'Charcoal'],
  },
  {
    id: 'spiked-leather-bracelet',
    name: 'Spiked Leather Bracelet',
    description: 'Genuine leather bracelet with metal spike studs. Adjustable snap closure.',
    price: 14.99,
    currency: 'USD',
    image: '/images/products/bracelet.jpg',
    category: 'accessories',
  },
  {
    id: 'skull-hoodie-exclusive',
    name: 'Hot Topic Exclusive Skull Hoodie',
    description: 'Heavyweight fleece hoodie with all-over skull print. Kangaroo pocket, drawstring hood.',
    price: 49.99,
    currency: 'USD',
    image: '/images/products/skull-hoodie.jpg',
    category: 'hoodies',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Black'],
  },
  {
    id: 'funko-pop-limited',
    name: 'Funko Pop! Limited Edition',
    description: 'Hot Topic exclusive Funko Pop! vinyl figure. Limited edition with chase variant.',
    price: 12.99,
    currency: 'USD',
    image: '/images/products/funko.jpg',
    category: 'collectibles',
  },
  {
    id: 'vip-monthly-box',
    name: 'Hot Topic VIP Monthly Box',
    description: 'Monthly subscription box with exclusive merch, band tees, and accessories. Cancel anytime.',
    price: 29.99,
    currency: 'USD',
    image: '/images/products/vip-box.jpg',
    category: 'subscriptions',
    isSubscription: true,
    subscriptionInterval: 'month',
    subscriptionAmount: 29.99,
  },
  {
    id: 'black-distressed-jeans',
    name: 'Black Distressed Skinny Jeans',
    description: 'Stretch denim skinny jeans with distressed detailing. 5-pocket styling.',
    price: 39.99,
    currency: 'USD',
    image: '/images/products/jeans.jpg',
    category: 'bottoms',
    sizes: ['28', '30', '32', '34', '36'],
    colors: ['Black'],
  },
  {
    id: 'enamel-pin-set',
    name: 'Enamel Pin Set (5-Pack)',
    description: 'Set of 5 collectible enamel pins featuring skulls, roses, and band logos.',
    price: 9.99,
    currency: 'USD',
    image: '/images/products/pins.jpg',
    category: 'accessories',
  },
];

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function calculateShippingMethods(address: {
  countryCode: string;
  administrativeArea?: string;
  postalCode?: string;
}): { methods: ShippingMethod[]; error?: string } {
  // International: not supported
  if (address.countryCode !== 'US') {
    return { methods: [], error: 'Shipping is not available to this address.' };
  }

  // PO Box check (simplified)
  if (address.postalCode && /^(0{5}|99999)/.test(address.postalCode)) {
    return { methods: [], error: 'Cannot ship to PO Box addresses.' };
  }

  const isHawaiiAlaska = ['HI', 'AK'].includes(
    address.administrativeArea || ''
  );
  const surcharge = isHawaiiAlaska ? 5.0 : 0;

  return {
    methods: [
      {
        id: 'standard',
        label: 'Standard Shipping',
        detail: '5-7 business days',
        amount: 5.99 + surcharge,
      },
      {
        id: 'express',
        label: 'Express Shipping',
        detail: '2-3 business days',
        amount: 12.99 + surcharge,
      },
      {
        id: 'next-day',
        label: 'Next Day Shipping',
        detail: '1 business day',
        amount: 19.99 + surcharge,
      },
    ],
  };
}

export function calculateTax(
  subtotal: number,
  stateCode: string
): number {
  const taxRates: Record<string, number> = {
    CA: 0.0725,
    NY: 0.08,
    TX: 0.0625,
    FL: 0.06,
    WA: 0.065,
    IL: 0.0625,
    PA: 0.06,
    OH: 0.0575,
    HI: 0.04,
    AK: 0.0,
    OR: 0.0,
    MT: 0.0,
    NH: 0.0,
    DE: 0.0,
  };

  const rate = taxRates[stateCode] ?? 0.055; // default 5.5%
  return Math.round(subtotal * rate * 100) / 100;
}

export const returningUser: UserProfile = {
  mode: 'returning',
  name: 'Alex Johnson',
  email: 'alex.johnson@example.com',
  phone: '407-555-0142',
  address: {
    addressLines: ['123 Main Street'],
    locality: 'Orlando',
    administrativeArea: 'FL',
    postalCode: '32801',
    countryCode: 'US',
  },
  previousPaymentMethod: 'applePay',
};

export const guestUser: UserProfile = {
  mode: 'guest',
};

export const firstTimeUser: UserProfile = {
  mode: 'first-time',
};
