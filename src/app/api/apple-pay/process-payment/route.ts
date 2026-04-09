import { NextResponse } from 'next/server';
import { processApplePayCharge, ChargeResponse, MERCHANT_ID, TERMINAL_ID } from '@/lib/commerce-hub';
import crypto from 'crypto';

function simulateCommerceHubResponse(
  amount: number,
  currency: string,
  orderId: string
): ChargeResponse {
  const approvalCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  return {
    gatewayResponse: {
      transactionType: 'CHARGE',
      transactionState: 'AUTHORIZED',
      transactionProcessingDetails: {
        transactionTimestamp: new Date().toISOString(),
        orderId,
        apiTraceId: crypto.randomUUID().slice(0, 16),
        clientRequestId: crypto.randomUUID(),
        transactionId: `txn_${Date.now()}`,
      },
    },
    source: {
      sourceType: 'ApplePay',
      card: {
        bin: '400556',
        last4: '4242',
        scheme: 'VISA',
        expirationMonth: '12',
        expirationYear: '2027',
      },
    },
    paymentReceipt: {
      approvedAmount: { total: amount, currency },
      processorResponseDetails: {
        approvalStatus: 'APPROVED',
        approvalCode,
        processor: 'FISERV',
        responseCode: '000',
        responseMessage: 'APPROVAL',
      },
    },
  };
}

function buildRequestPayload(
  paymentData: unknown,
  amount: number,
  currency: string,
  orderId: string
) {
  return {
    source: {
      sourceType: 'ApplePay',
      data: '(encrypted Apple Pay token)',
      header: {
        ephemeralPublicKey: '...',
        publicKeyHash: '...',
        transactionId: '...',
      },
      signature: '...',
      version: 'EC_v1',
    },
    transactionDetails: {
      captureFlag: true,
      merchantOrderId: orderId,
      merchantTransactionId: crypto.randomUUID(),
    },
    amount: { total: amount, currency },
    merchantDetails: {
      merchantId: MERCHANT_ID,
      terminalId: TERMINAL_ID,
    },
  };
}

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

    // Try real Commerce Hub first
    let result: ChargeResponse;
    let simulated = false;

    try {
      result = await processApplePayCharge(
        paymentData,
        amount,
        currency || 'USD',
        orderId
      );

      // If auth failed, fall back to simulation
      if (result.error && result.error.some((e) => e.message?.includes('invalid'))) {
        result = simulateCommerceHubResponse(amount, currency || 'USD', orderId);
        simulated = true;
      }
    } catch {
      // Network error or other failure — simulate
      result = simulateCommerceHubResponse(amount, currency || 'USD', orderId);
      simulated = true;
    }

    const isApproved =
      result.paymentReceipt?.processorResponseDetails?.approvalStatus ===
      'APPROVED';

    return NextResponse.json({
      success: isApproved,
      simulated,
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
      // Include what would be sent to Commerce Hub
      requestPayload: buildRequestPayload(paymentData, amount, currency || 'USD', orderId),
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
