import crypto from 'crypto';

const COMMERCE_HUB_ENDPOINT =
  process.env.COMMERCE_HUB_ENDPOINT ||
  'https://cert.api.fiservapps.com/ch/payments/v1/charges';

const API_KEY = process.env.COMMERCE_HUB_API_KEY || '';
const API_SECRET = process.env.COMMERCE_HUB_API_SECRET || '';
const MERCHANT_ID = process.env.COMMERCE_HUB_MID || '100027000300618';
const TERMINAL_ID = process.env.COMMERCE_HUB_TID || '10000001';

function generateHMACHeaders(body: string) {
  const timestamp = Date.now();
  const clientRequestId = crypto.randomUUID();
  const rawSignature = API_KEY + clientRequestId + timestamp + body;
  const hmac = crypto
    .createHmac('sha256', API_SECRET)
    .update(rawSignature)
    .digest('base64');

  return {
    'Content-Type': 'application/json',
    'Api-Key': API_KEY,
    Timestamp: timestamp.toString(),
    'Client-Request-Id': clientRequestId,
    'Auth-Token-Type': 'HMAC',
    'Message-Signature': hmac,
  };
}

export interface ApplePayTokenData {
  data: string;
  header: {
    ephemeralPublicKey: string;
    publicKeyHash: string;
    transactionId: string;
    applicationDataHash?: string;
  };
  signature: string;
  version: string;
}

export interface ChargeResponse {
  gatewayResponse?: {
    transactionType: string;
    transactionState: string;
    transactionProcessingDetails?: {
      transactionTimestamp: string;
      orderId: string;
      apiTraceId: string;
      clientRequestId: string;
      transactionId: string;
    };
  };
  source?: {
    sourceType: string;
    card?: {
      bin: string;
      last4: string;
      scheme: string;
      expirationMonth: string;
      expirationYear: string;
    };
  };
  paymentReceipt?: {
    approvedAmount: { total: number; currency: string };
    processorResponseDetails?: {
      approvalStatus: string;
      approvalCode: string;
      processor: string;
      responseCode: string;
      responseMessage: string;
    };
  };
  error?: Array<{ type: string; message: string; code: string }>;
}

export async function processApplePayCharge(
  tokenData: ApplePayTokenData,
  amount: number,
  currency: string,
  orderId: string
): Promise<ChargeResponse> {
  const requestBody = {
    source: {
      sourceType: 'ApplePay',
      data: tokenData.data,
      header: {
        ephemeralPublicKey: tokenData.header.ephemeralPublicKey,
        publicKeyHash: tokenData.header.publicKeyHash,
        transactionId: tokenData.header.transactionId,
        ...(tokenData.header.applicationDataHash && {
          applicationDataHash: tokenData.header.applicationDataHash,
        }),
      },
      signature: tokenData.signature,
      version: tokenData.version,
    },
    transactionDetails: {
      captureFlag: true,
      merchantOrderId: orderId,
      merchantTransactionId: crypto.randomUUID(),
    },
    amount: {
      total: amount,
      currency,
    },
    merchantDetails: {
      merchantId: MERCHANT_ID,
      terminalId: TERMINAL_ID,
    },
  };

  const bodyString = JSON.stringify(requestBody);
  const headers = generateHMACHeaders(bodyString);

  const response = await fetch(COMMERCE_HUB_ENDPOINT, {
    method: 'POST',
    headers,
    body: bodyString,
  });

  const data: ChargeResponse = await response.json();
  return data;
}

export { COMMERCE_HUB_ENDPOINT, MERCHANT_ID, TERMINAL_ID };
