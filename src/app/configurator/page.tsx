'use client';

import { useState } from 'react';
import { APPLE_PAY_BUTTON_STYLES, MERCHANT_IDS } from '@/lib/apple-pay-config';
import type {
  PagePlacement,
  CheckoutMode,
  PaymentType,
  ButtonStyle,
  ButtonType,
} from '@/lib/types';

export default function ConfiguratorPage() {
  const [placement, setPlacement] = useState<PagePlacement>('pdp');
  const [buttonStyle, setButtonStyle] = useState<ButtonStyle>('black');
  const [buttonType, setButtonType] = useState<ButtonType>('buy');
  const [cornerRadius, setCornerRadius] = useState(8);
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(48);
  const [language, setLanguage] = useState('en');
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>('express');
  const [paymentType, setPaymentType] = useState<PaymentType>('one-time');
  const [merchantId, setMerchantId] = useState<string>(MERCHANT_IDS[0]);
  const [activeTab, setActiveTab] = useState<'html' | 'js' | 'server' | 'sfcc'>('html');
  const [copied, setCopied] = useState(false);

  const [recurringConfig, setRecurringConfig] = useState({
    billingDescription: 'Hot Topic VIP Monthly Box',
    amount: '29.99',
    interval: 'month',
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Code generation
  const htmlCode = `<!-- Apple Pay Button -->
<style>
  apple-pay-button {
    --apple-pay-button-width: ${width}px;
    --apple-pay-button-height: ${height}px;
    --apple-pay-button-border-radius: ${cornerRadius}px;
    --apple-pay-button-padding: 0;
    --apple-pay-button-box-sizing: border-box;
    display: block;
  }
</style>

<apple-pay-button
  buttonstyle="${buttonStyle}"
  type="${buttonType}"
  locale="${language}"
  onclick="onApplePayClicked()"
></apple-pay-button>`;

  const jsCode = `// Apple Pay JS Integration
function onApplePayClicked() {
  if (!window.ApplePaySession) {
    alert('Apple Pay is not available');
    return;
  }

  const request = {
    countryCode: 'US',
    currencyCode: 'USD',
    supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
    merchantCapabilities: ['supports3DS', 'supportsCredit', 'supportsDebit'],
    total: {
      label: 'Hot Topic',
      amount: '49.99',
      type: '${checkoutMode === 'express' ? 'pending' : 'final'}',
    },${
    checkoutMode === 'express'
      ? `
    requiredShippingContactFields: [
      'postalAddress', 'name', 'phone', 'email'
    ],
    requiredBillingContactFields: ['postalAddress'],`
      : `
    requiredBillingContactFields: ['postalAddress'],`
  }${
    paymentType === 'recurring'
      ? `
    recurringPaymentRequest: {
      paymentDescription: '${recurringConfig.billingDescription}',
      regularBilling: {
        label: '${recurringConfig.billingDescription}',
        amount: '${recurringConfig.amount}',
        paymentTiming: 'recurring',
        recurringPaymentIntervalUnit: '${recurringConfig.interval}',
        recurringPaymentIntervalCount: 1,
      },
      managementURL: 'https://hottopic.com/account/subscriptions',
      tokenNotificationURL: 'https://api.hottopic.com/apple-pay/token-notification',
    },`
      : ''
  }
  };

  const session = new ApplePaySession(14, request);

  // Merchant Validation
  session.onvalidatemerchant = async (event) => {
    const response = await fetch('/api/apple-pay/validate-merchant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ validationURL: event.validationURL }),
    });
    const merchantSession = await response.json();
    session.completeMerchantValidation(merchantSession);
  };
${
  checkoutMode === 'express'
    ? `
  // Shipping Contact Selected (Express only)
  session.onshippingcontactselected = async (event) => {
    const { countryCode, administrativeArea, postalCode } =
      event.shippingContact;

    const response = await fetch('/api/shipping/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countryCode, administrativeArea, postalCode }),
    });
    const data = await response.json();

    session.completeShippingContactSelection({
      newShippingMethods: data.methods.map(m => ({
        label: m.label,
        detail: m.detail,
        amount: m.amount.toFixed(2),
        identifier: m.id,
      })),
      newLineItems: [
        { label: 'Subtotal', amount: '49.99' },
        { label: 'Shipping', amount: data.methods[0].amount.toFixed(2) },
        { label: 'Tax', amount: data.tax.toFixed(2) },
      ],
      newTotal: {
        label: 'Hot Topic',
        amount: (49.99 + data.methods[0].amount + data.tax).toFixed(2),
        type: 'final',
      },
    });
  };

  // Shipping Method Selected (Express only)
  session.onshippingmethodselected = async (event) => {
    const shippingAmount = parseFloat(event.shippingMethod.amount);
    session.completeShippingMethodSelection({
      newLineItems: [
        { label: 'Subtotal', amount: '49.99' },
        { label: 'Shipping', amount: shippingAmount.toFixed(2) },
      ],
      newTotal: {
        label: 'Hot Topic',
        amount: (49.99 + shippingAmount).toFixed(2),
        type: 'final',
      },
    });
  };
`
    : ''
}
  // Payment Authorized
  session.onpaymentauthorized = async (event) => {
    const response = await fetch('/api/apple-pay/process-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentData: event.payment.token.paymentData,
        amount: 49.99,
        currency: 'USD',
      }),
    });
    const result = await response.json();

    session.completePayment({
      status: result.success
        ? ApplePaySession.STATUS_SUCCESS
        : ApplePaySession.STATUS_FAILURE,
    });
  };

  session.oncancel = () => {
    console.log('Apple Pay session cancelled');
  };

  session.begin();
}`;

  const serverCode = `// Server-side: Commerce Hub Integration (Node.js)
import crypto from 'crypto';
import https from 'https';
import fs from 'fs';

const API_KEY = process.env.COMMERCE_HUB_API_KEY;
const API_SECRET = process.env.COMMERCE_HUB_API_SECRET;
const MID = '${merchantId.includes('commhubcert') ? '100027000300618' : 'YOUR_MID'}';
const TID = '10000001';
const ENDPOINT = 'https://cert.api.fiservapps.com/ch/payments/v1/charges';

// HMAC Auth Header Generation
function getHeaders(body) {
  const timestamp = Date.now();
  const clientRequestId = crypto.randomUUID();
  const raw = API_KEY + clientRequestId + timestamp + body;
  const hmac = crypto.createHmac('sha256', API_SECRET)
    .update(raw).digest('base64');

  return {
    'Content-Type': 'application/json',
    'Api-Key': API_KEY,
    'Timestamp': timestamp.toString(),
    'Client-Request-Id': clientRequestId,
    'Auth-Token-Type': 'HMAC',
    'Message-Signature': hmac,
  };
}

// Merchant Validation Endpoint
app.post('/api/apple-pay/validate-merchant', async (req, res) => {
  const { validationURL } = req.body;
  const cert = fs.readFileSync('./certs/ApplePay.crt.pem');
  const key = fs.readFileSync('./certs/ApplePay.key.pem');

  const body = JSON.stringify({
    merchantIdentifier: '${merchantId}',
    domainName: req.hostname,
    displayName: 'Hot Topic',
  });

  // TLS mutual auth call to Apple
  const merchantSession = await new Promise((resolve, reject) => {
    const url = new URL(validationURL);
    const options = {
      hostname: url.hostname, port: 443,
      path: url.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cert, key,
    };
    const r = https.request(options, (response) => {
      let data = '';
      response.on('data', c => data += c);
      response.on('end', () => resolve(JSON.parse(data)));
    });
    r.on('error', reject);
    r.write(body);
    r.end();
  });

  res.json(merchantSession);
});

// Payment Processing Endpoint
app.post('/api/apple-pay/process-payment', async (req, res) => {
  const { paymentData, amount, currency } = req.body;

  const requestBody = {
    source: {
      sourceType: 'ApplePay',
      data: paymentData.data,
      header: {
        ephemeralPublicKey: paymentData.header.ephemeralPublicKey,
        publicKeyHash: paymentData.header.publicKeyHash,
        transactionId: paymentData.header.transactionId,
      },
      signature: paymentData.signature,
      version: paymentData.version,
    },
    transactionDetails: {
      captureFlag: true,
      merchantOrderId: 'HT-' + Date.now(),
      merchantTransactionId: crypto.randomUUID(),
    },
    amount: { total: amount, currency },
    merchantDetails: { merchantId: MID, terminalId: TID },
  };

  const body = JSON.stringify(requestBody);
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: getHeaders(body),
    body,
  });

  res.json(await response.json());
});`;

  const sfccCode = `// SFCC Cartridge: Apple Pay Express Hooks
// File: cartridge/scripts/hooks/applePayExpress/

// hooks.json registration
{
  "dw.extensions.applepay.prepareBasket": "prepareBasket.js",
  "dw.extensions.applepay.getRequest": "getRequest.js",
  "dw.extensions.applepay.shippingContactSelected": "shippingContactSelected.js",
  "dw.extensions.applepay.shippingMethodSelected": "shippingMethodSelected.js",
  "dw.extensions.applepay.authorizeOrderPayment": "authorizeOrderPayment.js",
  "dw.extensions.applepay.cancel": "cancel.js"
}

// --- getRequest.js ---
exports.getRequest = function (basket, request) {
  request.requiredShippingContactFields = [
    'postalAddress', 'name', 'phone', 'email'
  ];
  request.requiredBillingContactFields = ['postalAddress'];

  request.lineItems = [
    { label: 'Subtotal', amount: basket.merchandizeTotalPrice.value.toFixed(2) },
    { label: 'Shipping (est.)', amount: '5.99' },
    { label: 'Tax (est.)', amount: '0.00' }
  ];

  request.total = {
    label: 'Hot Topic',
    amount: basket.totalGrossPrice.value.toFixed(2),
    type: 'pending'
  };

  return new Status(Status.OK);
};

// --- shippingContactSelected.js ---
exports.shippingContactSelected = function (basket, event, response) {
  var address = basket.defaultShipment.shippingAddress;
  var ShippingMgr = require('dw/order/ShippingMgr');
  var model = ShippingMgr.getShipmentShippingModel(basket.defaultShipment);
  var methods = model.applicableShippingMethods;

  // Apply first available method
  basket.defaultShipment.setShippingMethod(methods[0]);

  // Recalculate
  require('*/cartridge/scripts/helpers/basketCalculationHelpers')
    .calculateTotals(basket);

  response.shippingMethods = methods.toArray().map(function (m) {
    return {
      label: m.displayName,
      detail: m.description || '',
      amount: ShippingMgr.getShippingCost(model, m).amount.value.toFixed(2),
      identifier: m.ID
    };
  });

  response.lineItems = [
    { label: 'Subtotal', amount: basket.merchandizeTotalPrice.value.toFixed(2) },
    { label: 'Shipping', amount: basket.shippingTotalPrice.value.toFixed(2) },
    { label: 'Tax', amount: basket.totalTax.value.toFixed(2) }
  ];

  response.total = {
    label: 'Hot Topic',
    amount: basket.totalGrossPrice.value.toFixed(2),
    type: 'final'
  };

  return new Status(Status.OK);
};

// ISML Template (PDP):
// <isapplepay sku="\${pdict.product.ID}" qty="1" class="apple-pay-express-pdp" />

// ISML Template (Cart):
// <isapplepay cart="true" class="apple-pay-express-cart" />`;

  const codeMap = { html: htmlCode, js: jsCode, server: serverCode, sfcc: sfccCode };

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Left Panel: Controls */}
      <div className="w-96 border-r border-border overflow-y-auto p-6 space-y-6 bg-surface">
        <h1 className="text-xl font-bold">
          Apple Pay <span className="text-accent">Configurator</span>
        </h1>

        {/* Page Placement */}
        <section>
          <h2 className="text-sm font-bold text-muted mb-2">Page Placement</h2>
          <div className="grid grid-cols-2 gap-2">
            {(['pdp', 'cart', 'mini-cart', 'checkout'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlacement(p)}
                className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                  placement === p
                    ? 'bg-accent text-white'
                    : 'bg-background border border-border hover:border-accent'
                }`}
              >
                {p === 'pdp' ? 'Product Page' : p === 'mini-cart' ? 'Mini-Cart' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </section>

        {/* Button Style */}
        <section>
          <h2 className="text-sm font-bold text-muted mb-2">Button Color</h2>
          <div className="flex gap-2">
            {APPLE_PAY_BUTTON_STYLES.colors.map((c) => (
              <button
                key={c}
                onClick={() => setButtonStyle(c)}
                className={`px-3 py-2 rounded text-xs font-medium border transition-colors ${
                  buttonStyle === c
                    ? 'border-accent ring-1 ring-accent'
                    : 'border-border'
                } ${
                  c === 'black'
                    ? 'bg-black text-white'
                    : c === 'white'
                    ? 'bg-white text-black'
                    : 'bg-white text-black border-2 border-black'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        {/* Button Type */}
        <section>
          <h2 className="text-sm font-bold text-muted mb-2">Button Type</h2>
          <select
            value={buttonType}
            onChange={(e) => setButtonType(e.target.value as ButtonType)}
            className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
          >
            {APPLE_PAY_BUTTON_STYLES.types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </section>

        {/* Dimensions */}
        <section>
          <h2 className="text-sm font-bold text-muted mb-2">Dimensions</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted">
                Corner Radius: {cornerRadius}px
              </label>
              <input
                type="range"
                min={0}
                max={50}
                value={cornerRadius}
                onChange={(e) => setCornerRadius(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
            <div>
              <label className="text-xs text-muted">Width: {width}px</label>
              <input
                type="range"
                min={150}
                max={400}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
            <div>
              <label className="text-xs text-muted">Height: {height}px</label>
              <input
                type="range"
                min={30}
                max={64}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
          </div>
        </section>

        {/* Language */}
        <section>
          <h2 className="text-sm font-bold text-muted mb-2">Language</h2>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
          >
            {APPLE_PAY_BUTTON_STYLES.languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </section>

        {/* Checkout Mode */}
        <section>
          <h2 className="text-sm font-bold text-muted mb-2">Checkout Mode</h2>
          <div className="flex gap-2">
            {(['express', 'standard'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setCheckoutMode(mode)}
                className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  checkoutMode === mode
                    ? 'bg-accent text-white'
                    : 'bg-background border border-border hover:border-accent'
                }`}
              >
                {mode === 'express' ? 'Express' : 'Standard'}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted mt-1">
            {checkoutMode === 'express'
              ? 'Collects shipping address in the Apple Pay sheet.'
              : 'Payment only — shipping collected separately.'}
          </p>
        </section>

        {/* Payment Type */}
        <section>
          <h2 className="text-sm font-bold text-muted mb-2">Payment Type</h2>
          <div className="flex gap-2">
            {(['one-time', 'recurring'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setPaymentType(type)}
                className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  paymentType === type
                    ? 'bg-accent text-white'
                    : 'bg-background border border-border hover:border-accent'
                }`}
              >
                {type === 'one-time' ? 'One-Time' : 'Recurring'}
              </button>
            ))}
          </div>

          {paymentType === 'recurring' && (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={recurringConfig.billingDescription}
                onChange={(e) =>
                  setRecurringConfig({
                    ...recurringConfig,
                    billingDescription: e.target.value,
                  })
                }
                className="w-full bg-background border border-border rounded px-3 py-2 text-xs"
                placeholder="Billing description"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={recurringConfig.amount}
                  onChange={(e) =>
                    setRecurringConfig({
                      ...recurringConfig,
                      amount: e.target.value,
                    })
                  }
                  className="flex-1 bg-background border border-border rounded px-3 py-2 text-xs"
                  placeholder="Amount"
                />
                <select
                  value={recurringConfig.interval}
                  onChange={(e) =>
                    setRecurringConfig({
                      ...recurringConfig,
                      interval: e.target.value,
                    })
                  }
                  className="bg-background border border-border rounded px-2 py-2 text-xs"
                >
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
            </div>
          )}
        </section>

        {/* Merchant Config */}
        <section>
          <h2 className="text-sm font-bold text-muted mb-2">Merchant ID</h2>
          <select
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            className="w-full bg-background border border-border rounded px-3 py-2 text-xs"
          >
            {MERCHANT_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </section>
      </div>

      {/* Right Panel: Preview + Code */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Preview */}
        <div className="flex-1 flex items-center justify-center bg-background p-8">
          <div className="w-[375px] bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden">
            {/* Phone Chrome */}
            <div className="h-8 bg-surface-hover flex items-center justify-center">
              <div className="w-20 h-1 rounded-full bg-border" />
            </div>

            {/* Page Context */}
            <div className="p-4 space-y-3">
              {placement === 'pdp' && (
                <>
                  <div className="aspect-video bg-background rounded-lg flex items-center justify-center text-4xl">
                    👕
                  </div>
                  <h3 className="font-bold text-sm">
                    Metallica Ride The Lightning Tee
                  </h3>
                  <p className="text-accent font-bold">$24.99</p>
                  <button className="w-full bg-accent text-white py-2.5 rounded-lg text-sm font-medium">
                    Add to Cart
                  </button>
                </>
              )}
              {placement === 'cart' && (
                <>
                  <h3 className="font-bold text-sm">Shopping Cart (2 items)</h3>
                  <div className="bg-background rounded-lg p-3 flex gap-2 text-xs">
                    <span>👕</span>
                    <div>
                      <p>Metallica Tee</p>
                      <p className="text-accent">$24.99</p>
                    </div>
                  </div>
                  <div className="bg-background rounded-lg p-3 flex gap-2 text-xs">
                    <span>💀</span>
                    <div>
                      <p>Spiked Bracelet</p>
                      <p className="text-accent">$14.99</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                    <span>Total</span>
                    <span>$39.98</span>
                  </div>
                </>
              )}
              {placement === 'mini-cart' && (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-sm">Your Cart</h3>
                    <span className="text-muted text-xs">2 items</span>
                  </div>
                  <div className="bg-background rounded-lg p-2 flex gap-2 text-xs">
                    <span>👕</span>
                    <span>Metallica Tee</span>
                    <span className="ml-auto text-accent">$24.99</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span>Subtotal</span>
                    <span>$24.99</span>
                  </div>
                </>
              )}
              {placement === 'checkout' && (
                <>
                  <h3 className="font-bold text-sm">Payment Method</h3>
                  <div className="bg-background rounded-lg p-3 border border-accent text-xs flex items-center gap-2">
                    <input
                      type="radio"
                      checked
                      readOnly
                      className="accent-accent"
                    />
                    <span>Apple Pay</span>
                  </div>
                  <div className="bg-background rounded-lg p-3 border border-border text-xs flex items-center gap-2">
                    <input type="radio" readOnly className="accent-accent" />
                    <span>Credit Card</span>
                  </div>
                </>
              )}

              {/* Apple Pay Button Preview */}
              <div
                style={{
                  backgroundColor:
                    buttonStyle === 'black' ? '#000' : '#fff',
                  color: buttonStyle === 'black' ? '#fff' : '#000',
                  border:
                    buttonStyle === 'white-outline'
                      ? '1px solid #000'
                      : 'none',
                  borderRadius: `${cornerRadius}px`,
                  height: `${height}px`,
                  width: `${Math.min(width, 343)}px`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 500,
                  margin: '0 auto',
                }}
              >
                {buttonType === 'plain'
                  ? 'Pay'
                  : `${buttonType.charAt(0).toUpperCase() + buttonType.slice(1).replace('-', ' ')} with `}
                <span style={{ marginLeft: '4px', fontWeight: 700 }}>
                   Pay
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Code Output */}
        <div className="h-80 border-t border-border bg-surface flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(
              [
                { id: 'html', label: 'HTML/CSS' },
                { id: 'js', label: 'JavaScript' },
                { id: 'server', label: 'Server (Node.js)' },
                { id: 'sfcc', label: 'SFCC Hooks' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => handleCopy(codeMap[activeTab])}
              className="ml-auto px-4 py-2 text-xs text-muted hover:text-accent transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Code */}
          <pre className="flex-1 overflow-auto p-4 text-xs text-foreground font-mono leading-relaxed">
            {codeMap[activeTab]}
          </pre>
        </div>
      </div>
    </div>
  );
}
