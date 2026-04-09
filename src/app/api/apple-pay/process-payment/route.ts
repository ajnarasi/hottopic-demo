import { NextResponse } from 'next/server';
import { processApplePayCharge } from '@/lib/commerce-hub';

export async function POST(request: Request) {
  try {
    const { paymentData, amount, currency, productId } = await request.json();

    if (!paymentData) {
      return NextResponse.json(
        { error: 'paymentData is required' },
        { status: 400 }
      );
    }

    const orderId = `HT-${Date.now()}-${productId || 'cart'}`;

    const result = await processApplePayCharge(
      paymentData,
      amount,
      currency || 'USD',
      orderId
    );

    const isApproved =
      result.paymentReceipt?.processorResponseDetails?.approvalStatus ===
      'APPROVED';

    return NextResponse.json({
      success: isApproved,
      orderId,
      transactionId:
        result.gatewayResponse?.transactionProcessingDetails?.transactionId,
      approvalCode:
        result.paymentReceipt?.processorResponseDetails?.approvalCode,
      processor:
        result.paymentReceipt?.processorResponseDetails?.processor,
      responseCode:
        result.paymentReceipt?.processorResponseDetails?.responseCode,
      responseMessage:
        result.paymentReceipt?.processorResponseDetails?.responseMessage,
      card: result.source?.card,
      amount: result.paymentReceipt?.approvedAmount,
      raw: result,
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Payment processing failed',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
