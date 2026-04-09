import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import https from 'https';


function loadCertificates(): { cert?: Buffer; key?: Buffer; source: string } {
  let cert: Buffer | undefined;
  let key: Buffer | undefined;
  let source = 'none';

  // Priority 1: Base64-encoded env vars (works on Vercel/serverless)
  if (process.env.APPLE_PAY_CERT_BASE64) {
    cert = Buffer.from(process.env.APPLE_PAY_CERT_BASE64, 'base64');
    source = 'base64-env';
  }
  if (process.env.APPLE_PAY_KEY_BASE64) {
    key = Buffer.from(process.env.APPLE_PAY_KEY_BASE64, 'base64');
  }

  // Priority 2: File paths (works locally)
  if (!cert) {
    const certPath = process.env.APPLE_PAY_CERT_PATH;
    if (certPath && fs.existsSync(path.resolve(certPath))) {
      cert = fs.readFileSync(path.resolve(certPath));
      source = 'file';
    }
  }
  if (!key) {
    const keyPath = process.env.APPLE_PAY_CERT_KEY_PATH;
    if (keyPath && fs.existsSync(path.resolve(keyPath))) {
      key = fs.readFileSync(path.resolve(keyPath));
    }
  }

  // If combined PEM (cert + key in one file), use for both
  if (cert && !key) {
    key = cert;
  }

  return { cert, key, source };
}

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

    const { cert, key, source } = loadCertificates();

    if (!cert || !key) {
      return NextResponse.json(
        {
          error: 'Merchant validation failed',
          details: 'Apple Pay merchant identity certificate not configured. Set APPLE_PAY_CERT_BASE64 and APPLE_PAY_KEY_BASE64 environment variables.',
          certSource: source,
          certLoaded: !!cert,
          keyLoaded: !!key,
        },
        { status: 500 }
      );
    }

    // Verify cert/key are valid PEM
    const certStr = cert.toString('utf8');
    const keyStr = key.toString('utf8');
    const certValid = certStr.includes('-----BEGIN CERTIFICATE-----');
    const keyValid = keyStr.includes('-----BEGIN RSA PRIVATE KEY-----') || keyStr.includes('-----BEGIN PRIVATE KEY-----');

    const body = JSON.stringify({
      merchantIdentifier: merchantId,
      domainName,
      displayName,
      initiative: 'web',
      initiativeContext: domainName,
    });

    const merchantSession = await new Promise((resolve, reject) => {
      const url = new URL(validationURL);

      // Use an Agent with explicit TLS options for better serverless compatibility
      const agent = new https.Agent({
        cert: certStr,
        key: keyStr,
        rejectUnauthorized: true,
      });

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
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Invalid response from Apple: ${data}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(new Error(`${err.message} [certSource=${source}, certValid=${certValid}, keyValid=${keyValid}, certLen=${cert.length}, keyLen=${key.length}]`));
      });
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
