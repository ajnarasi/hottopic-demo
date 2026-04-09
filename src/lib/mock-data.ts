import { Product, ShippingMethod, UserProfile } from './types';

export const products: Product[] = [
  {
    id: 'cogimyun-cherries-hoodie',
    name: 'Cogimyun Cherries Blue Girls Hoodie',
    description: 'Cozy blue hoodie featuring Cogimyun with cherry accents. Front pouch pocket, drawstring hood. Officially licensed Sanrio merchandise.',
    price: 54.90,
    currency: 'USD',
    image: 'https://picsum.photos/seed/hoodie-blue/500/666',
    category: 'hoodies',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2X', '3X'],
    colors: ['Blue'],
  },
  {
    id: 'cogimyun-cherry-reversible',
    name: 'Cogimyun Cherry Heart Reversible Plush',
    description: 'Soft reversible plush featuring Cogimyun with cherry heart design. Two looks in one! Officially licensed Sanrio merchandise.',
    price: 16.90,
    currency: 'USD',
    image: 'https://picsum.photos/seed/plush-pink/500/666',
    category: 'collectibles',
  },
  {
    id: 'sanrio-ranking-2026-tee',
    name: 'Sanrio Character Ranking 2026 Grid T-Shirt',
    description: 'Official Sanrio Character Ranking 2026 badge grid t-shirt. Features all your favorite Sanrio characters. 100% cotton.',
    price: 26.90,
    currency: 'USD',
    image: 'https://picsum.photos/seed/sanrio-tee/500/666',
    category: 'band-tees',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2X'],
    colors: ['Lavender', 'White'],
  },
  {
    id: 'sanrio-ranking-tote',
    name: 'Sanrio Character Ranking Tote Bag',
    description: 'Canvas tote bag featuring the Sanrio Character Ranking design. Perfect for everyday carry.',
    price: 19.90,
    currency: 'USD',
    image: 'https://picsum.photos/seed/tote-bag/500/666',
    category: 'accessories',
  },
  {
    id: 'metallica-lightning-tee',
    name: 'Metallica Ride The Lightning Boyfriend Fit T-Shirt',
    description: 'Relaxed boyfriend fit tee featuring the iconic Ride The Lightning album artwork. 100% cotton.',
    price: 24.90,
    currency: 'USD',
    image: 'https://picsum.photos/seed/metallica/500/666',
    category: 'band-tees',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2X'],
    colors: ['Black'],
  },
  {
    id: 'hello-kitty-hoodie',
    name: 'Hello Kitty Cherry Blossom Girls Hoodie',
    description: 'Pink hoodie with Hello Kitty cherry blossom embroidery. Kangaroo pocket, drawstring hood.',
    price: 54.90,
    currency: 'USD',
    image: 'https://picsum.photos/seed/kitty-hoodie/500/666',
    category: 'hoodies',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2X', '3X'],
    colors: ['Pink'],
  },
  {
    id: 'funko-pop-kuromi',
    name: 'Funko Pop! Sanrio Kuromi Vinyl Figure Hot Topic Exclusive',
    description: 'Hot Topic exclusive Funko Pop! vinyl figure of Kuromi from Sanrio. Collectible #1234.',
    price: 14.90,
    currency: 'USD',
    image: 'https://picsum.photos/seed/funko-kuromi/500/666',
    category: 'collectibles',
  },
  {
    id: 'chain-wallet-skull',
    name: 'Black Skull Chain Wallet',
    description: 'Faux leather trifold wallet with metal skull accent and detachable chain.',
    price: 15.90,
    currency: 'USD',
    image: 'https://picsum.photos/seed/wallet-skull/500/666',
    category: 'accessories',
  },
  {
    id: 'nirvana-smiley-tee',
    name: 'Nirvana Smiley Face Oversized T-Shirt',
    description: 'Oversized fit tee with the classic Nirvana smiley face. Dropped shoulders, relaxed through body.',
    price: 29.90,
    currency: 'USD',
    image: 'https://picsum.photos/seed/nirvana-smiley/500/666',
    category: 'band-tees',
    sizes: ['S', 'M', 'L', 'XL', '2X'],
    colors: ['Black', 'Charcoal'],
  },
  {
    id: 'enamel-pin-set-sanrio',
    name: 'Sanrio Characters Enamel Pin Set (5-Pack)',
    description: 'Set of 5 collectible enamel pins featuring Hello Kitty, My Melody, Kuromi, Cinnamoroll, and Pompompurin.',
    price: 12.90,
    currency: 'USD',
    image: 'https://picsum.photos/seed/sanrio-pins/500/666',
    category: 'accessories',
  },
  {
    id: 'super-mario-galaxy-tee',
    name: 'Super Mario Galaxy Movie Bowser T-Shirt',
    description: 'Official Super Mario Galaxy movie tee featuring Bowser and Yoshi. 100% cotton.',
    price: 24.90,
    currency: 'USD',
    image: 'https://picsum.photos/seed/mario-tee/500/666',
    category: 'band-tees',
    sizes: ['S', 'M', 'L', 'XL', '2X'],
    colors: ['Purple'],
  },
  {
    id: 'hottopic-vip-box',
    name: 'Hot Topic VIP Monthly Box',
    description: 'Monthly subscription box with exclusive merch, band tees, anime accessories, and collectibles. Cancel anytime.',
    price: 39.99,
    currency: 'USD',
    image: 'https://picsum.photos/seed/vip-box/500/666',
    category: 'subscriptions',
    isSubscription: true,
    subscriptionInterval: 'month',
    subscriptionAmount: 39.99,
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
  if (address.countryCode !== 'US') {
    return { methods: [], error: 'Shipping is not available to this address.' };
  }

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
    CA: 0.0725, NY: 0.08, TX: 0.0625, FL: 0.06, WA: 0.065,
    IL: 0.0625, PA: 0.06, OH: 0.0575, HI: 0.04,
    AK: 0.0, OR: 0.0, MT: 0.0, NH: 0.0, DE: 0.0,
  };
  const rate = taxRates[stateCode] ?? 0.055;
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

export const guestUser: UserProfile = { mode: 'guest' };
export const firstTimeUser: UserProfile = { mode: 'first-time' };
