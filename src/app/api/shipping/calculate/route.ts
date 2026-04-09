import { NextResponse } from 'next/server';
import { calculateShippingMethods, calculateTax } from '@/lib/mock-data';

export async function POST(request: Request) {
  try {
    const { countryCode, administrativeArea, postalCode, subtotal } =
      await request.json();

    const result = calculateShippingMethods({
      countryCode: countryCode || 'US',
      administrativeArea,
      postalCode,
    });

    if (result.error) {
      return NextResponse.json({
        error: result.error,
        methods: [],
      });
    }

    const tax = calculateTax(subtotal || 0, administrativeArea || '');

    return NextResponse.json({
      methods: result.methods,
      tax,
      freeShippingThreshold: 50,
    });
  } catch (error) {
    console.error('Shipping calculation error:', error);
    return NextResponse.json(
      { error: 'Shipping calculation failed' },
      { status: 500 }
    );
  }
}
