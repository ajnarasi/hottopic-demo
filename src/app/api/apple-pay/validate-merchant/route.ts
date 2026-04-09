import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import https from 'https';

export async function POST(request: Request) {
  try {
    const { validationURL } = await request.json();

    if (!validationURL) {
      return NextResponse.json(
        { error: 'validationURL is required' },
        { status: 400 }
      );
    }

    const merchantId =
      process.env.APPLE_PAY_MERCHANT_ID ||
      'merchant.com.us.fiserv.carat.commhubcert.2d7c44572e';
    const displayName = 'Hot Topic';
    const domainName = request.headers.get('host') || 'localhost';

    // Load merchant identity certificate
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

    // If we have a combined PEM (cert + key), use it for both
    if (cert && !key) {
      key = cert;
    }

    const body = JSON.stringify({
      merchantIdentifier: merchantId,
      domainName,
      displayName,
      initiative: 'web',
      initiativeContext: domainName,
    });

    // Make TLS mutual auth request to Apple's validation endpoint
    const merchantSession = await new Promise((resolve, reject) => {
      const url = new URL(validationURL);
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
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Invalid response from Apple: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });

    return NextResponse.json(merchantSession);
  } catch (error) {
    console.error('Merchant validation error:', error);
    return NextResponse.json(
      {
        error: 'Merchant validation failed',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
