import { NextResponse } from 'next/server';

// Apple Pay Merchant Token lifecycle notification endpoint
// Apple sends GET requests here when token events occur (UNLINK, etc.)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const eventId = url.pathname.split('/').pop();

  console.log('[Apple Pay Token Notification]', {
    eventId,
    method: 'GET',
    timestamp: new Date().toISOString(),
  });

  // In production, you would:
  // 1. Extract the eventId
  // 2. POST to Apple's API to get event details:
  //    POST https://apple-pay-gateway.apple.com/paymentServices/v1/merchantId/{merchantId}/merchantToken/event/{eventId}
  // 3. Handle the event (UNLINK → prompt user to update payment method)

  return NextResponse.json({
    received: true,
    eventId,
    message: 'Merchant token notification received (sandbox)',
  });
}

// Also handle POST in case Apple sends POST notifications
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  console.log('[Apple Pay Token Notification POST]', {
    body,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({
    received: true,
    message: 'Merchant token notification received (sandbox)',
  });
}
