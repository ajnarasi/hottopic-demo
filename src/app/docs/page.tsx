'use client';

import { useState, useEffect } from 'react';

const TOC = [
  { id: 'overview', label: 'Overview & Architecture' },
  { id: 'merchant-setup', label: 'Merchant Setup Steps' },
  { id: 'sequence', label: 'Sequence Diagrams' },
  { id: 'callbacks', label: 'Callbacks Reference' },
  { id: 'usecases', label: 'Use Cases' },
  { id: 'api-specs', label: 'Commerce Hub API' },
  { id: 'workflows', label: 'Workflow Diagrams' },
  { id: 'states', label: 'State Diagrams' },
  { id: 'testing', label: 'Test Cases' },
];

function CodeBlock({ children, title }: { children: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative my-4 rounded-lg border border-border overflow-hidden">
      {title && (
        <div className="bg-surface px-4 py-2 text-xs font-bold text-muted border-b border-border flex justify-between items-center">
          {title}
          <button
            onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="text-[10px] text-muted hover:text-foreground"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-[12px] leading-relaxed font-mono bg-[#fafafa] text-gray-800">
        {children}
      </pre>
    </div>
  );
}

function MermaidDiagram({ chart, caption }: { chart: string; caption: string }) {
  const [svgHtml, setSvgHtml] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const id = `mermaid-${Math.random().toString(36).slice(2, 8)}`;

    import('mermaid').then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
      // Render to string (not DOM) to avoid React conflicts
      mermaid.render(id, chart.trim()).then(({ svg }) => {
        if (!cancelled) setSvgHtml(svg);
      }).catch(() => {
        if (!cancelled) setSvgHtml(`<pre style="font-size:11px;line-height:1.6;color:#555;white-space:pre;overflow-x:auto">${chart.trim().replace(/</g, '&lt;')}</pre>`);
      });
    }).catch(() => {
      if (!cancelled) setSvgHtml(`<pre style="font-size:11px;line-height:1.6;color:#555;white-space:pre;overflow-x:auto">${chart.trim().replace(/</g, '&lt;')}</pre>`);
    });

    return () => { cancelled = true; };
  }, [chart]);

  return (
    <div className="my-6 p-4 bg-[#fafafa] rounded-lg border border-border">
      <p className="text-xs font-bold text-muted mb-3 uppercase tracking-wide">{caption}</p>
      {svgHtml ? (
        <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: svgHtml }} />
      ) : (
        <div className="text-xs text-muted animate-pulse py-4">Loading diagram...</div>
      )}
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className="flex max-w-7xl mx-auto">
      {/* Sidebar TOC */}
      <nav className="w-56 shrink-0 sticky top-[120px] self-start hidden lg:block p-4">
        <h3 className="text-[10px] font-bold text-muted uppercase tracking-wide mb-3">Documentation</h3>
        <ul className="space-y-1">
          {TOC.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={() => setActiveSection(item.id)}
                className={`block text-xs py-1.5 px-2 rounded transition-colors ${
                  activeSection === item.id ? 'bg-accent/10 text-accent font-semibold' : 'text-muted hover:text-foreground'
                }`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8 max-w-4xl">
        <h1 className="text-3xl font-black mb-2">Apple Pay Integration Guide</h1>
        <p className="text-muted mb-8">Commerce Hub + SFCC — Technical Documentation for Hot Topic</p>

        {/* ======= OVERVIEW ======= */}
        <section id="overview" className="mb-12">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-border">Overview & Architecture</h2>
          <p className="text-sm text-muted mb-4">
            Apple Pay on the web allows customers to make purchases using Face ID, Touch ID, or their Apple Watch.
            When integrated with Fiserv Commerce Hub as the Payment Service Provider (PSP), the payment flow involves
            multiple parties working together to authorize and settle the transaction.
          </p>

          <h3 className="text-sm font-bold mb-3">Payment Flow Architecture</h3>
          <div className="overflow-x-auto">
            <div className="flex items-center gap-2 text-[11px] font-mono text-center min-w-[700px] py-4">
              {['Customer\n(Device)', 'Merchant\nWebsite', 'Merchant\nServer', 'Apple Pay\nServers', 'Commerce Hub\n(Fiserv)', 'Acquirer', 'Network\n(Visa/MC)', 'Issuer'].map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="bg-surface border border-border rounded-lg px-3 py-2 text-foreground whitespace-pre-line min-w-[80px]">
                    {label}
                  </div>
                  {i < 7 && <span className="text-muted">→</span>}
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted mt-4">
            The customer authenticates with biometrics. The encrypted payment token flows from Apple through the merchant
            server to Commerce Hub, which decrypts it and sends a 3D Secure authorization to the card network.
          </p>

          <h3 className="text-sm font-bold mt-6 mb-2">Key Concepts</h3>
          <ul className="text-sm text-muted space-y-2 list-disc list-inside">
            <li><strong>DPAN</strong> — Device Primary Account Number (device-specific token for one-time payments)</li>
            <li><strong>MPAN</strong> — Merchant Primary Account Number (merchant-specific token for recurring payments)</li>
            <li><strong>Merchant Identity Certificate</strong> — TLS client cert for merchant validation with Apple</li>
            <li><strong>Payment Processing Certificate</strong> — Used by Commerce Hub to decrypt payment tokens</li>
          </ul>
        </section>

        {/* ======= MERCHANT SETUP STEPS ======= */}
        <section id="merchant-setup" className="mb-12">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-border">Merchant Setup Steps</h2>
          <p className="text-sm text-muted mb-6">
            These are the real steps a Commerce Hub merchant must complete to enable Apple Pay on their website.
          </p>

          <div className="space-y-4">
            {[
              { step: 1, title: 'Confirm PSP supports Apple Pay', who: 'PAYMENTS TEAM', desc: 'Verify that Fiserv Commerce Hub supports Apple Pay wallet transactions. Commerce Hub accepts encrypted Apple Pay tokens via the walletPaymentMethod.encryptedApplePay source type.' },
              { step: 2, title: 'Enroll in Apple Developer Program', who: 'ACCOUNT ADMIN', desc: 'Sign up at developer.apple.com. An Apple Developer account ($99/year) is required to create merchant IDs and certificates.' },
              { step: 3, title: 'Create a Merchant ID', who: 'ACCOUNT ADMIN', desc: 'In Apple Developer portal → Identifiers → Merchant IDs. Register a reverse-domain identifier (e.g., merchant.com.hottopic.pay). This uniquely identifies your business to Apple Pay.' },
              { step: 4, title: 'Create a Merchant Identity Certificate', who: 'SERVER ADMIN', desc: 'Generate an RSA 2048-bit CSR on your server. Upload to Apple Developer portal under the Merchant ID. Download the .cer file. Convert to PEM format. This certificate is used for TLS mutual authentication during merchant validation.' },
              { step: 5, title: 'Create a Payment Processing Certificate', who: 'PAYMENTS TEAM', desc: 'Your PSP (Commerce Hub) provides a CSR. Upload to Apple under "Apple Pay Payment Processing Certificate". Return the .cer to Commerce Hub. This enables Commerce Hub to decrypt Apple Pay tokens.' },
              { step: 6, title: 'Register and verify your domain(s)', who: 'SERVER ADMIN', desc: 'In Apple Developer portal, add each domain where Apple Pay will appear. Download the domain verification file and host it at /.well-known/apple-developer-merchantid-domain-association. Apple fetches this file to verify ownership.' },
              { step: 7, title: 'Implement Apple Pay JS on your website', who: 'DEVELOPER', desc: 'Load the Apple Pay JS SDK. Check availability with applePayCapabilities(). Display the Apple Pay button. Handle all payment sheet callbacks (onvalidatemerchant, onshippingcontactselected, onpaymentauthorized, etc.).' },
              { step: 8, title: 'Implement server-side merchant validation', who: 'SERVER ADMIN', desc: 'When onvalidatemerchant fires, your server must POST to Apple\'s validation URL with the Merchant Identity Certificate (TLS mutual auth). Include merchantIdentifier, domainName, displayName, initiative: "web", and initiativeContext.' },
              { step: 9, title: 'Integrate with Commerce Hub', who: 'DEVELOPER', desc: 'Send the encrypted Apple Pay token to Commerce Hub\'s POST /payments/v1/charges endpoint with sourceType: "ApplePay". Include HMAC authentication headers. Commerce Hub decrypts the token and processes the authorization.' },
              { step: 10, title: 'Test in sandbox', who: 'DEVELOPER + PAYMENTS TEAM', desc: 'Use Apple Pay sandbox test cards. Test on Safari (native sheet), Chrome (scannable code for iPhone), and multiple devices. Verify shipping callbacks, recurring payments, and error handling.' },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 p-4 border border-border rounded-lg">
                <div className="shrink-0 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {s.step}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold">{s.title}</h3>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">{s.who}</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <MermaidDiagram
            caption="Merchant Onboarding Workflow"
            chart={`graph TD
    A[Create Apple Developer Account] --> B[Register Merchant ID]
    B --> C[Create Merchant Identity Certificate]
    B --> D[Create Payment Processing Certificate]
    C --> E[Register & Verify Domain]
    D --> F[Configure Commerce Hub]
    E --> G[Implement Apple Pay JS]
    F --> G
    G --> H[Test in Sandbox]
    H --> I[Deploy to Production]

    style A fill:#f8f8f8,stroke:#ccc
    style B fill:#f8f8f8,stroke:#ccc
    style C fill:#e8f4fd,stroke:#0a84ff
    style D fill:#e8f4fd,stroke:#0a84ff
    style E fill:#e8f4fd,stroke:#0a84ff
    style F fill:#fff3e0,stroke:#ff9800
    style G fill:#e8f5e9,stroke:#4caf50
    style H fill:#e8f5e9,stroke:#4caf50
    style I fill:#e8f5e9,stroke:#4caf50`}
          />
        </section>

        {/* ======= SEQUENCE DIAGRAMS ======= */}
        <section id="sequence" className="mb-12">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-border">Sequence Diagrams</h2>

          <h3 className="text-sm font-bold mb-2">Apple Pay on the Web — Direct Integration</h3>
          <MermaidDiagram
            caption="Web Direct Integration Flow (matches Apple Integration Guide p.27)"
            chart={`sequenceDiagram
    participant B as Browser
    participant S as Merchant Server
    participant A as Apple Servers
    participant C as Commerce Hub

    B->>B: canMakePayments()
    B->>B: Show Apple Pay button

    Note over B: User taps Apple Pay
    B->>B: new ApplePaySession(14, request)
    B->>B: session.begin()

    A-->>B: onvalidatemerchant event
    B->>S: POST /validate-merchant
    S->>A: POST paymentSession (TLS mutual auth)
    A-->>S: Merchant session blob
    S-->>B: Return session
    B->>B: completeMerchantValidation()

    Note over B: Payment Sheet displayed

    opt Payment Method Event
        A-->>B: onpaymentmethodselected
        B->>B: completePaymentMethodSelection()
    end

    opt Shipping Contact Event
        A-->>B: onshippingcontactselected
        B->>S: Calculate shipping & tax
        S-->>B: Methods + totals
        B->>B: completeShippingContactSelection()
    end

    opt Shipping Method Event
        A-->>B: onshippingmethodselected
        B->>B: completeShippingMethodSelection()
    end

    Note over B: User authenticates (Face ID / Touch ID)
    Note over A: Apple encrypts payment token

    A-->>B: onpaymentauthorized
    B->>S: Send encrypted token
    S->>C: POST /payments/v1/charges
    C->>C: Decrypt token
    C-->>S: Authorization response
    S-->>B: Result
    B->>B: completePayment(status)`}
          />

          <h3 className="text-sm font-bold mt-8 mb-2">Third-Party Browser Flow (Chrome, Firefox, Edge)</h3>
          <MermaidDiagram
            caption="Cross-browser flow via Apple Pay code (requires iPhone with iOS 18+)"
            chart={`sequenceDiagram
    participant D as Desktop Browser
    participant S as Merchant Server
    participant A as Apple Servers
    participant I as iPhone (iOS 18+)

    Note over D: Apple Pay JS SDK loaded
    D->>D: ApplePaySession exists
    Note over D: User clicks Apple Pay
    D->>D: session.begin()

    Note over D: Code displayed on screen

    I->>A: User scans code with Camera
    I->>I: Authenticate via Face ID
    A->>A: Generate payment token

    A-->>D: onpaymentauthorized
    D->>S: Send encrypted token
    S->>S: Process via Commerce Hub
    S-->>D: Result
    D->>D: completePayment()
    Note over D: Success displayed`}
          />

          <h3 className="text-sm font-bold mt-8 mb-2">Recurring Payment Flow</h3>
          <MermaidDiagram
            caption="Subscription with Merchant Token lifecycle"
            chart={`sequenceDiagram
    participant Cu as Customer
    participant S as Merchant Server
    participant A as Apple Servers
    participant C as Commerce Hub

    Note over Cu: Subscribe via Apple Pay
    Cu->>Cu: recurringPaymentRequest
    Cu->>Cu: Auth (Face ID)
    A-->>Cu: MPAN token returned
    Cu->>S: Send MPAN token
    S->>S: Store MPAN for recurring
    S->>C: Initial charge (MPAN)
    C-->>S: Approved

    Note over S: Time passes...
    S->>C: Recurring charge (MPAN)
    C-->>S: Approved

    Note over A: Token lifecycle event
    A->>S: GET tokenNotificationURL
    S->>A: POST to get event details
    A-->>S: Event: UNLINK / card update
    Note over S: Update payment method`}
          />
        </section>

        {/* ======= CALLBACKS ======= */}
        <section id="callbacks" className="mb-12">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-border">Callbacks Reference</h2>
          <p className="text-sm text-muted mb-4">
            Every callback must be completed within 30 seconds or Apple Pay times out the session.
          </p>

          <div className="space-y-6">
            {/* onvalidatemerchant */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-blue-50 px-4 py-2 border-b border-border">
                <code className="text-sm font-bold text-blue-800">onvalidatemerchant</code>
                <span className="text-xs text-blue-600 ml-2">→ completeMerchantValidation(session)</span>
              </div>
              <div className="p-4 text-sm text-muted">
                <p className="mb-2">Fires immediately after <code>session.begin()</code>. The merchant server must call Apple&apos;s payment session endpoint with the Merchant Identity Certificate (TLS mutual auth).</p>
                <CodeBlock title="Input (event)">{`{
  validationURL: "https://apple-pay-gateway.apple.com/paymentservices/startSession"
}`}</CodeBlock>
                <CodeBlock title="Server Request to Apple">{`POST {validationURL}
{
  "merchantIdentifier": "merchant.app.vercel.hottopic",
  "domainName": "hottopic-demo.vercel.app",
  "displayName": "Hot Topic",
  "initiative": "web",
  "initiativeContext": "hottopic-demo.vercel.app"
}`}</CodeBlock>
                <CodeBlock title="Response (merchant session — pass to completeMerchantValidation)">{`{
  "epochTimestamp": 1712620800000,
  "expiresAt": 1712624400000,
  "merchantSessionIdentifier": "SSH...",
  "nonce": "abc123",
  "merchantIdentifier": "merchant.app.vercel.hottopic",
  "domainName": "hottopic-demo.vercel.app",
  "displayName": "Hot Topic",
  "signature": "..."
}`}</CodeBlock>
              </div>
            </div>

            {/* onpaymentmethodselected */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-blue-50 px-4 py-2 border-b border-border">
                <code className="text-sm font-bold text-blue-800">onpaymentmethodselected</code>
                <span className="text-xs text-blue-600 ml-2">→ completePaymentMethodSelection(update)</span>
              </div>
              <div className="p-4 text-sm text-muted">
                <p className="mb-2">Fires when user selects or changes their payment card in the sheet. Use to update totals if pricing depends on card type (e.g., debit card discount).</p>
                <CodeBlock title="Input">{`{
  paymentMethod: {
    displayName: "Visa 1234",
    network: "visa",
    type: "credit"
  }
}`}</CodeBlock>
                <CodeBlock title="Response">{`{
  newTotal: { label: "Hot Topic", amount: "49.90", type: "final" },
  newLineItems: [...]  // optional
}`}</CodeBlock>
              </div>
            </div>

            {/* onshippingcontactselected */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-blue-50 px-4 py-2 border-b border-border">
                <code className="text-sm font-bold text-blue-800">onshippingcontactselected</code>
                <span className="text-xs text-blue-600 ml-2">→ completeShippingContactSelection(update)</span>
              </div>
              <div className="p-4 text-sm text-muted">
                <p className="mb-2">Fires when user selects or changes shipping address. Only partial address available before auth — use for shipping method/tax calculation. <strong>Must complete within 30 seconds.</strong></p>
                <CodeBlock title="Input (redacted address)">{`{
  shippingContact: {
    country: "US",
    administrativeArea: "CA",
    locality: "San Jose",
    postalCode: "95014",
    countryCode: "US"
  }
}`}</CodeBlock>
                <CodeBlock title="Response">{`{
  newShippingMethods: [
    { label: "Standard", detail: "5-7 days", amount: "5.99", identifier: "standard" },
    { label: "Express", detail: "2-3 days", amount: "12.99", identifier: "express" }
  ],
  newLineItems: [
    { label: "Subtotal", amount: "49.90" },
    { label: "Shipping", amount: "5.99" },
    { label: "Tax", amount: "3.62" }
  ],
  newTotal: { label: "Hot Topic", amount: "59.51", type: "final" }
}`}</CodeBlock>
              </div>
            </div>

            {/* onshippingmethodselected */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-blue-50 px-4 py-2 border-b border-border">
                <code className="text-sm font-bold text-blue-800">onshippingmethodselected</code>
                <span className="text-xs text-blue-600 ml-2">→ completeShippingMethodSelection(update)</span>
              </div>
              <div className="p-4 text-sm text-muted">
                <p className="mb-2">Fires when user selects a different shipping method. Recalculate totals.</p>
                <CodeBlock title="Input">{`{
  shippingMethod: {
    label: "Express Shipping",
    detail: "2-3 business days",
    amount: "12.99",
    identifier: "express"
  }
}`}</CodeBlock>
              </div>
            </div>

            {/* onpaymentauthorized */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-blue-50 px-4 py-2 border-b border-border">
                <code className="text-sm font-bold text-blue-800">onpaymentauthorized</code>
                <span className="text-xs text-blue-600 ml-2">→ completePayment(result)</span>
              </div>
              <div className="p-4 text-sm text-muted">
                <p className="mb-2">Fires after biometric authentication. Contains the encrypted payment token — send this to Commerce Hub for processing.</p>
                <CodeBlock title="Input (payment object)">{`{
  payment: {
    token: {
      paymentData: { data: "...", signature: "...", header: {...}, version: "EC_v1" },
      paymentMethod: { displayName: "Visa 1234", network: "visa", type: "credit" },
      transactionIdentifier: "ba9c...7298"
    },
    billingContact: { givenName: "John", familyName: "Appleseed", ... },
    shippingContact: { givenName: "John", emailAddress: "...", ... }
  }
}`}</CodeBlock>
                <CodeBlock title="Complete Payment">{`session.completePayment({
  status: ApplePaySession.STATUS_SUCCESS  // or STATUS_FAILURE
});`}</CodeBlock>
              </div>
            </div>

            {/* oncouponcodechanged */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-border">
                <code className="text-sm font-bold text-gray-600">oncouponcodechanged</code>
                <span className="text-xs text-gray-500 ml-2">→ completeCouponCodeChange(update) — v14+</span>
              </div>
              <div className="p-4 text-sm text-muted">
                <p>Fires when user enters a coupon code. Enable by adding <code>supportsCouponCode: true</code> and <code>couponCode: &quot;&quot;</code> to the payment request.</p>
              </div>
            </div>

            {/* oncancel */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-border">
                <code className="text-sm font-bold text-gray-600">oncancel</code>
                <span className="text-xs text-gray-500 ml-2">→ (no completion method)</span>
              </div>
              <div className="p-4 text-sm text-muted">
                <p>Fires when user dismisses the payment sheet. Use for cleanup (e.g., remove temporary PDP basket for Express Checkout).</p>
              </div>
            </div>
          </div>
        </section>

        {/* ======= USE CASES ======= */}
        <section id="usecases" className="mb-12">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-border">Use Cases & Implementation</h2>

          <div className="space-y-6">
            {[
              { num: 1, title: 'One-Time Payment (Basic)', desc: 'Standard Apple Pay button on the checkout page. Shipping and billing collected beforehand.' },
              { num: 2, title: 'Express Checkout (PDP/Cart)', desc: 'Apple Pay button on product or cart page. Shipping collected in the payment sheet via onshippingcontactselected.' },
              { num: 3, title: 'Recurring / Subscription', desc: 'Add recurringPaymentRequest with paymentDescription, regularBilling, trialBilling, managementURL, tokenNotificationURL.' },
              { num: 4, title: 'Shipping Address Update', desc: 'Handle onshippingcontactselected to calculate dynamic shipping rates and tax by address. Must respond within 30 seconds.' },
              { num: 5, title: 'Coupon Code', desc: 'Set supportsCouponCode: true in payment request. Handle oncouponcodechanged to validate and apply discounts.' },
              { num: 6, title: 'Error Handling', desc: 'Use ApplePayError for invalid addresses (shippingContactInvalid), invalid coupons (couponCodeInvalid), and declined payments.' },
              { num: 7, title: 'Third-Party Browser', desc: 'Load Apple Pay JS SDK. ApplePaySession automatically shows a scannable code on Chrome/Firefox/Edge. User scans with iPhone running iOS 18+.' },
              { num: 8, title: 'Card on File / Returning User', desc: 'Pre-populate shippingContact in payment request with stored address. Display "Pay with saved Apple Pay" as default option.' },
              { num: 9, title: 'One-Click Express', desc: 'Apple Pay on PDP with requiredShippingContactFields. Product → payment sheet → confirmation. Bypasses cart entirely.' },
              { num: 10, title: 'Payment Method Change', desc: 'Handle onpaymentmethodselected to update totals if pricing depends on card type (e.g., debit discount).' },
            ].map((uc) => (
              <div key={uc.num} className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-accent text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{uc.num}</span>
                  <h3 className="text-sm font-bold">{uc.title}</h3>
                </div>
                <p className="text-sm text-muted">{uc.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ======= API SPECS ======= */}
        <section id="api-specs" className="mb-12">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-border">Commerce Hub API Specs</h2>

          <h3 className="text-sm font-bold mb-2">Merchant Validation (Server → Apple)</h3>
          <CodeBlock title="POST to Apple's validation URL (from onvalidatemerchant event)">{`POST https://apple-pay-gateway.apple.com/paymentservices/paymentSession
Headers:
  Content-Type: application/json
  (TLS mutual auth with Merchant Identity Certificate)

Body:
{
  "merchantIdentifier": "merchant.app.vercel.hottopic",
  "domainName": "hottopic-demo.vercel.app",
  "displayName": "Hot Topic",
  "initiative": "web",
  "initiativeContext": "hottopic-demo.vercel.app"
}`}</CodeBlock>

          <h3 className="text-sm font-bold mt-6 mb-2">Commerce Hub Charge Request</h3>
          <CodeBlock title="POST https://cert.api.fiservapps.com/ch/payments/v1/charges">{`Headers:
  Content-Type: application/json
  Api-Key: {apiKey}
  Timestamp: {epochMillis}
  Client-Request-Id: {uuid}
  Auth-Token-Type: HMAC
  Message-Signature: {base64(sha256(apiKey + clientRequestId + timestamp + body))}

Body:
{
  "source": {
    "sourceType": "ApplePay",
    "data": "<base64 encrypted payment token>",
    "header": {
      "ephemeralPublicKey": "...",
      "publicKeyHash": "...",
      "transactionId": "..."
    },
    "signature": "...",
    "version": "EC_v1"
  },
  "transactionDetails": {
    "captureFlag": true,
    "merchantOrderId": "HT-1234567890",
    "merchantTransactionId": "uuid"
  },
  "amount": {
    "total": 49.90,
    "currency": "USD"
  },
  "merchantDetails": {
    "merchantId": "100184000000381",
    "terminalId": "10000001"
  }
}`}</CodeBlock>

          <h3 className="text-sm font-bold mt-6 mb-2">Commerce Hub Response</h3>
          <CodeBlock title="Approval Response">{`{
  "gatewayResponse": {
    "transactionType": "CHARGE",
    "transactionState": "AUTHORIZED",
    "transactionProcessingDetails": {
      "transactionTimestamp": "2026-04-09T...",
      "orderId": "HT-1234567890",
      "transactionId": "txn_..."
    }
  },
  "source": {
    "sourceType": "ApplePay",
    "card": {
      "bin": "400556", "last4": "4242",
      "scheme": "VISA"
    }
  },
  "paymentReceipt": {
    "approvedAmount": { "total": 49.90, "currency": "USD" },
    "processorResponseDetails": {
      "approvalStatus": "APPROVED",
      "approvalCode": "A3X2F1",
      "responseCode": "000",
      "responseMessage": "APPROVAL"
    }
  }
}`}</CodeBlock>
        </section>

        {/* ======= WORKFLOWS ======= */}
        <section id="workflows" className="mb-12">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-border">Workflow Diagrams</h2>

          <MermaidDiagram
            caption="SFCC Cartridge Integration Workflow"
            chart={`graph TD
    A[Install Commerce Hub LINK Cartridge] --> B[Register Apple Pay hooks]
    B --> B1[prepareBasket.js]
    B --> B2[getRequest.js]
    B --> B3[shippingContactSelected.js]
    B --> B4[shippingMethodSelected.js]
    B --> B5[authorizeOrderPayment.js]
    B --> B6[cancel.js]
    B1 --> C[Add isapplepay tags to ISML templates]
    B6 --> C
    C --> C1[PDP template]
    C --> C2[Cart template]
    C --> C3[Mini-Cart template]
    C1 --> D[Configure Business Manager]
    C3 --> D
    D --> E[Place in SITE cartridge path]
    E --> F[Test Express Checkout E2E]

    style A fill:#e3f2fd,stroke:#1976d2
    style B fill:#e3f2fd,stroke:#1976d2
    style D fill:#fff3e0,stroke:#f57c00
    style F fill:#e8f5e9,stroke:#388e3c`}
          />

          <MermaidDiagram
            caption="Payment Processing Workflow"
            chart={`graph LR
    A[Apple Pay Token] --> B[Merchant Server]
    B --> C{Commerce Hub}
    C --> D[Decrypt Token]
    D --> E[3DS Authorization]
    E --> F{Acquirer}
    F --> G[Card Network]
    G --> H[Issuer]
    H --> |Approved| I[Authorization Response]
    H --> |Declined| J[Decline Response]
    I --> C
    J --> C
    C --> B
    B --> K[completePayment]

    style A fill:#f3e5f5,stroke:#7b1fa2
    style C fill:#fff3e0,stroke:#f57c00
    style H fill:#e8f5e9,stroke:#388e3c`}
          />
        </section>

        {/* ======= STATE DIAGRAMS ======= */}
        <section id="states" className="mb-12">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-border">State Diagrams</h2>

          <MermaidDiagram
            caption="ApplePaySession State Machine"
            chart={`stateDiagram-v2
    [*] --> IDLE
    IDLE --> MERCHANT_VALIDATING: session.begin()
    MERCHANT_VALIDATING --> SHEET_PRESENTED: completeMerchantValidation()
    SHEET_PRESENTED --> SHIPPING_EVENTS: onshippingcontactselected
    SHEET_PRESENTED --> PAYMENT_METHOD_EVENTS: onpaymentmethodselected
    SHEET_PRESENTED --> COUPON_EVENTS: oncouponcodechanged
    SHIPPING_EVENTS --> SHEET_PRESENTED: completeShippingContactSelection()
    PAYMENT_METHOD_EVENTS --> SHEET_PRESENTED: completePaymentMethodSelection()
    COUPON_EVENTS --> SHEET_PRESENTED: completeCouponCodeChange()
    SHEET_PRESENTED --> AUTHORIZING: User authenticates
    AUTHORIZING --> COMPLETE: onpaymentauthorized
    COMPLETE --> SUCCESS: completePayment(SUCCESS)
    COMPLETE --> FAILURE: completePayment(FAILURE)
    SHEET_PRESENTED --> CANCELLED: User dismisses sheet
    MERCHANT_VALIDATING --> CANCELLED: Validation fails`}
          />

          <MermaidDiagram
            caption="Commerce Hub Transaction States"
            chart={`stateDiagram-v2
    [*] --> INITIATED
    INITIATED --> AUTHORIZED: POST /payments/v1/charges
    INITIATED --> DECLINED: Auth fails
    AUTHORIZED --> CAPTURED: POST /payments/v1/capture
    AUTHORIZED --> VOIDED: POST /payments/v1/void
    CAPTURED --> REFUNDED: POST /payments/v1/refund`}
          />
        </section>

        {/* ======= TEST CASES ======= */}
        <section id="testing" className="mb-12">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-border">E2E Test Cases</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="text-left p-2 font-bold">#</th>
                  <th className="text-left p-2 font-bold">Test Case</th>
                  <th className="text-left p-2 font-bold">Steps</th>
                  <th className="text-left p-2 font-bold">Expected Result</th>
                  <th className="text-left p-2 font-bold">Browser</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ['1', 'Basic one-time payment', 'PDP → Apple Pay → address → shipping → auth', 'Order confirmed, approved', 'Safari'],
                  ['2', 'Express checkout (PDP)', 'PDP → Apple Pay → shipping in sheet → auth', 'Cart bypassed, confirmed', 'Safari'],
                  ['3', 'Cart Express checkout', 'Add items → cart → Apple Pay → auth', 'All items in order', 'Safari'],
                  ['4', 'Standard checkout', 'Cart → checkout → Apple Pay → auth', 'Payment only, shipping pre-collected', 'Safari'],
                  ['5', 'Shipping address change', 'Payment → change to Hawaii', 'Surcharge +$5 applied', 'Safari'],
                  ['6', 'Invalid address', 'Payment → PO Box address', 'Error: Cannot ship to PO Box', 'Safari'],
                  ['7', 'Recurring subscription', 'Subscription product → Apple Pay', 'Recurring billing in sheet', 'Safari'],
                  ['8', 'Payment method change', 'Payment → switch card', 'Callback fires, totals update', 'Safari'],
                  ['9', 'Cancel payment', 'Open sheet → dismiss', 'Session cancelled, no order', 'Safari'],
                  ['10', 'Third-party browser', 'PDP → Apple Pay on Chrome', 'Code appears for scan', 'Chrome macOS'],
                  ['11', 'Returning user', 'Set Returning → Apple Pay', 'Pre-populated shipping', 'Any'],
                  ['12', 'Guest user', 'Set Guest → Apple Pay', 'Empty shipping fields', 'Any'],
                  ['13', 'Configurator styling', 'Change to white → check PDP', 'White Apple Pay button', 'Any'],
                  ['14', 'Commerce Hub trace', 'Complete payment → trace', 'Full req/response shown', 'Any'],
                  ['15', 'Domain verification', 'GET /.well-known/...', 'Returns association file', 'Any'],
                ].map((row) => (
                  <tr key={row[0]} className="hover:bg-surface/50">
                    <td className="p-2 font-mono">{row[0]}</td>
                    <td className="p-2 font-medium">{row[1]}</td>
                    <td className="p-2 text-muted">{row[2]}</td>
                    <td className="p-2 text-muted">{row[3]}</td>
                    <td className="p-2"><span className="bg-surface px-1.5 py-0.5 rounded text-[10px] font-medium">{row[4]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
