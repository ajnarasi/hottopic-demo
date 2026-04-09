import { NextResponse } from 'next/server';
import { MERCHANT_IDS } from '@/lib/apple-pay-config';
import fs from 'fs';
import path from 'path';
import https from 'https';

async function testMerchantId(
  merchantId: string,
  cert?: Buffer,
  key?: Buffer
): Promise<{ merchantId: string; success: boolean; error?: string; response?: unknown }> {
  const testValidationURL =
    'https://apple-pay-gateway-cert.apple.com/paymentservices/startSession';

  const body = JSON.stringify({
    merchantIdentifier: merchantId,
    domainName: 'hottopic-demo.vercel.app',
    displayName: 'Hot Topic',
  });

  return new Promise((resolve) => {
    const url = new URL(testValidationURL);
    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      ...(cert && { cert }),
      ...(key && { key }),
      rejectUnauthorized: true,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.statusCode) {
            resolve({
              merchantId,
              success: false,
              error: parsed.statusMessage || `Status: ${parsed.statusCode}`,
              response: parsed,
            });
          } else {
            resolve({ merchantId, success: true, response: parsed });
          }
        } catch {
          resolve({
            merchantId,
            success: false,
            error: `Invalid response: ${data.substring(0, 200)}`,
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ merchantId, success: false, error: String(err) });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ merchantId, success: false, error: 'Timeout' });
    });

    req.write(body);
    req.end();
  });
}

export async function GET() {
  let cert: Buffer | undefined;
  let key: Buffer | undefined;

  const certPath = process.env.APPLE_PAY_CERT_PATH;
  const keyPath = process.env.APPLE_PAY_CERT_KEY_PATH;

  if (certPath && fs.existsSync(path.resolve(certPath))) {
    cert = fs.readFileSync(path.resolve(certPath));
  }
  if (keyPath && fs.existsSync(path.resolve(keyPath))) {
    key = fs.readFileSync(path.resolve(keyPath));
  }
  if (cert && !key) key = cert;

  const results = await Promise.all(
    MERCHANT_IDS.map((id) => testMerchantId(id, cert, key))
  );

  const working = results.filter((r) => r.success);

  return NextResponse.json({
    certLoaded: !!cert,
    keyLoaded: !!key,
    results,
    recommendation: working.length > 0
      ? `Use merchant ID: ${working[0].merchantId}`
      : 'No merchant IDs validated successfully. Check your certificate files.',
  });
}
