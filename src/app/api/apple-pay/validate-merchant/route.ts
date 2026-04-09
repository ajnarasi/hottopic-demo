import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import https from 'https';

const PROXY_URL = process.env.APPLE_PAY_PROXY_URL || 'https://apple-pay-proxy.onrender.com/validate';

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
      'merchant.app.vercel.hottopic';
    const displayName = 'Hot Topic';
    const domainName = request.headers.get('host')?.split(':')[0] || 'hottopic-demo.vercel.app';

    // Use mTLS proxy for Vercel (serverless doesn't support outbound mTLS)
    // Falls back to direct Apple call for local dev where certs are on filesystem
    const useProxy = !!process.env.APPLE_PAY_PROXY_URL || !canLoadLocalCerts();

    if (useProxy) {
      const proxyRes = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validationURL,
          merchantIdentifier: merchantId,
          domainName,
          displayName,
        }),
      });
      const merchantSession = await proxyRes.json();
      return NextResponse.json(merchantSession);
    }

    // Direct call (local dev with filesystem certs)
    const cert = fs.readFileSync(path.resolve(process.env.APPLE_PAY_CERT_PATH!));
    const key = fs.readFileSync(path.resolve(process.env.APPLE_PAY_CERT_KEY_PATH!));

    const body = JSON.stringify({
      merchantIdentifier: merchantId,
      domainName,
      displayName,
      initiative: 'web',
      initiativeContext: domainName,
    });

    const merchantSession = await new Promise((resolve, reject) => {
      const url = new URL(validationURL);
      const agent = new https.Agent({ cert, key, rejectUnauthorized: true });
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        agent,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error(`Invalid response from Apple: ${data}`)); }
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
      { error: 'Merchant validation failed', details: String(error) },
      { status: 500 }
    );
  }
}

function canLoadLocalCerts(): boolean {
  const certPath = process.env.APPLE_PAY_CERT_PATH;
  const keyPath = process.env.APPLE_PAY_CERT_KEY_PATH;
  return !!(certPath && fs.existsSync(path.resolve(certPath)) &&
            keyPath && fs.existsSync(path.resolve(keyPath)));
}
