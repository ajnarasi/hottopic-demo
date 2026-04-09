'use client';

import { useState, useEffect } from 'react';
import { useDebug } from '@/components/storefront/DebugPanel';

interface LineItem {
  label: string;
  amount: string;
}

interface ShippingMethod {
  id: string;
  label: string;
  detail: string;
  amount: number;
}

interface SimulatedPaymentSheetProps {
  open: boolean;
  onClose: () => void;
  merchantName: string;
  lineItems: LineItem[];
  total: number;
  isExpress: boolean;
  isRecurring?: boolean;
  recurringDescription?: string;
  onComplete: (result: {
    success: boolean;
    orderId?: string;
    shippingAddress?: Record<string, string>;
    shippingMethod?: ShippingMethod;
  }) => void;
}

const TEST_ADDRESSES = [
  {
    label: 'Home - Orlando, FL',
    givenName: 'Alex',
    familyName: 'Johnson',
    addressLines: ['123 Main Street'],
    locality: 'Orlando',
    administrativeArea: 'FL',
    postalCode: '32801',
    countryCode: 'US',
  },
  {
    label: 'Work - San Jose, CA',
    givenName: 'Alex',
    familyName: 'Johnson',
    addressLines: ['1 Infinite Loop'],
    locality: 'San Jose',
    administrativeArea: 'CA',
    postalCode: '95014',
    countryCode: 'US',
  },
  {
    label: 'Vacation - Honolulu, HI',
    givenName: 'Alex',
    familyName: 'Johnson',
    addressLines: ['2500 Kalakaua Ave'],
    locality: 'Honolulu',
    administrativeArea: 'HI',
    postalCode: '96815',
    countryCode: 'US',
  },
  {
    label: 'No Tax - Portland, OR',
    givenName: 'Alex',
    familyName: 'Johnson',
    addressLines: ['1000 SW Broadway'],
    locality: 'Portland',
    administrativeArea: 'OR',
    postalCode: '97205',
    countryCode: 'US',
  },
];

const TEST_CARDS = [
  { label: 'Visa ****4242', brand: 'visa', last4: '4242' },
  { label: 'Mastercard ****5555', brand: 'mastercard', last4: '5555' },
  { label: 'Amex ****0005', brand: 'amex', last4: '0005' },
];

type Step = 'address' | 'shipping' | 'review' | 'authenticating' | 'processing' | 'done';

export default function SimulatedPaymentSheet({
  open,
  onClose,
  merchantName,
  lineItems: initialLineItems,
  total: initialTotal,
  isExpress,
  isRecurring,
  recurringDescription,
  onComplete,
}: SimulatedPaymentSheetProps) {
  const [step, setStep] = useState<Step>(isExpress ? 'address' : 'review');
  const [selectedAddress, setSelectedAddress] = useState(0);
  const [selectedCard, setSelectedCard] = useState(0);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShipping, setSelectedShipping] = useState(0);
  const [tax, setTax] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lineItems, setLineItems] = useState(initialLineItems);
  const [total, setTotal] = useState(initialTotal);
  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
  const [couponValid, setCouponValid] = useState(false);
  const addDebug = useDebug((s) => s.addEntry);

  useEffect(() => {
    if (open) {
      setStep(isExpress ? 'address' : 'review');
      setSelectedAddress(0);
      setSelectedCard(0);
      setCouponCode('');
      setCouponMessage('');
      setCouponValid(false);
      setSelectedShipping(0);
      setShippingMethods([]);
      setTax(0);
      setLineItems(initialLineItems);
      setTotal(initialTotal);
    }
  }, [open, isExpress, initialLineItems, initialTotal]);

  if (!open) return null;

  const address = TEST_ADDRESSES[selectedAddress];

  const fetchShipping = async (addrIndex: number) => {
    setLoading(true);
    const addr = TEST_ADDRESSES[addrIndex];

    addDebug({
      category: 'apple-pay-callback',
      type: 'event',
      label: 'onshippingcontactselected',
      description: `Consumer selected ${addr.label}. Calculating shipping methods and tax.`,
      data: { countryCode: addr.countryCode, administrativeArea: addr.administrativeArea, postalCode: addr.postalCode },
    });

    try {
      const res = await fetch('/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: addr.countryCode,
          administrativeArea: addr.administrativeArea,
          postalCode: addr.postalCode,
          subtotal: initialTotal,
        }),
      });
      const data = await res.json();

      addDebug({
        category: 'shipping-api',
        type: 'response',
        label: 'Shipping & Tax Calculated',
        description: data.error ? `Error: ${data.error}` : `${data.methods?.length || 0} methods, tax: $${(data.tax || 0).toFixed(2)}`,
        data,
      });

      if (data.error) {
        setShippingMethods([]);
        setTax(0);
      } else {
        setShippingMethods(data.methods);
        setTax(data.tax || 0);
        setSelectedShipping(0);
        const shipping = data.methods[0]?.amount || 0;
        const newTotal = initialTotal + shipping + (data.tax || 0);
        setTotal(newTotal);
        setLineItems([
          ...initialLineItems,
          { label: 'Shipping', amount: shipping.toFixed(2) },
          { label: 'Tax', amount: (data.tax || 0).toFixed(2) },
        ]);
      }
    } catch (err) {
      addDebug({ category: 'shipping-api', type: 'response', label: 'Shipping Error', data: { error: String(err) } });
    }
    setLoading(false);
  };

  const handleAddressSelect = async (index: number) => {
    setSelectedAddress(index);
    await fetchShipping(index);
    setStep('shipping');
  };

  const handleShippingSelect = (index: number) => {
    setSelectedShipping(index);
    const method = shippingMethods[index];
    const shipping = method?.amount || 0;
    const newTotal = initialTotal + shipping + tax;
    setTotal(newTotal);
    setLineItems([
      ...initialLineItems,
      { label: 'Shipping', amount: shipping.toFixed(2) },
      { label: 'Tax', amount: tax.toFixed(2) },
    ]);
    addDebug({
      category: 'apple-pay-callback',
      type: 'event',
      label: 'onshippingmethodselected',
      description: `Shipping changed to ${method?.label || 'unknown'} ($${shipping.toFixed(2)})`,
      data: method,
    });
  };

  const handleCardSelect = (index: number) => {
    setSelectedCard(index);
    const card = TEST_CARDS[index];
    addDebug({
      category: 'apple-pay-callback',
      type: 'event',
      label: 'onpaymentmethodselected',
      description: `Card changed to ${card.label}`,
      data: { displayName: card.label, network: card.brand, type: 'credit' },
    });
  };

  const handleApplyCoupon = () => {
    const code = couponCode.toUpperCase().trim();
    addDebug({
      category: 'apple-pay-callback',
      type: 'event',
      label: 'oncouponcodechanged',
      description: `Coupon code entered: "${code}"`,
      data: { couponCode: code },
    });

    if (code === 'HOTTOPIC20') {
      const discount = Math.round(initialTotal * 0.2 * 100) / 100;
      const newTotal = total - discount;
      setTotal(newTotal);
      setLineItems([
        ...lineItems.filter((l) => !l.label.startsWith('Discount')),
        { label: 'Discount (20% off)', amount: (-discount).toFixed(2) },
      ]);
      setCouponValid(true);
      setCouponMessage('HOTTOPIC20 applied — 20% off!');
      addDebug({ category: 'apple-pay-callback', type: 'response', label: 'Coupon Applied', description: '20% discount applied', data: { code, discount } });
    } else if (code === 'FREESHIP') {
      setCouponValid(true);
      setCouponMessage('Free shipping applied!');
      addDebug({ category: 'apple-pay-callback', type: 'response', label: 'Coupon Applied', description: 'Free shipping', data: { code } });
    } else if (code) {
      setCouponValid(false);
      setCouponMessage(`"${code}" is not a valid coupon`);
      addDebug({ category: 'apple-pay-callback', type: 'response', label: 'Coupon Invalid', description: `Code "${code}" rejected`, data: { code } });
    }
  };

  const handleAuthorize = async () => {
    setStep('authenticating');

    addDebug({
      category: 'apple-pay-callback',
      type: 'event',
      label: 'onpaymentauthorized',
      description: 'Consumer authorized via Face ID/Touch ID. Encrypted payment token received.',
      data: { card: TEST_CARDS[selectedCard].label },
    });

    // Simulate biometric delay
    await new Promise((r) => setTimeout(r, 1500));

    setStep('processing');

    addDebug({
      category: 'internal-event',
      type: 'event',
      label: 'authorizeOrderPayment',
      description: 'Sending encrypted Apple Pay token to Commerce Hub for processing.',
      data: {
        amount: total,
        card: TEST_CARDS[selectedCard].label,
        address: isExpress ? address.label : 'Collected at checkout',
      },
    });

    const start = Date.now();
    try {
      const res = await fetch('/api/apple-pay/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentData: {
            // Simulated Apple Pay token structure for sandbox
            data: btoa(JSON.stringify({
              applicationPrimaryAccountNumber: '4005562233445564',
              applicationExpirationDate: '271231',
              currencyCode: '840',
              transactionAmount: Math.round(total * 100),
              deviceManufacturerIdentifier: '050110030273',
              paymentDataType: '3DSecure',
              paymentData: {
                onlinePaymentCryptogram: btoa('SimulatedCryptogram123'),
                eciIndicator: '7',
              },
            })),
            header: {
              ephemeralPublicKey: btoa('SimulatedEphemeralPublicKey'),
              publicKeyHash: btoa('SimulatedPublicKeyHash'),
              transactionId: crypto.randomUUID().replace(/-/g, ''),
            },
            signature: btoa('SimulatedSignature'),
            version: 'EC_v1',
          },
          amount: total,
          currency: 'USD',
          productId: 'simulated-demo',
        }),
      });
      const result = await res.json();

      if (result.requestPayload) {
        addDebug({
          category: 'commerce-hub-api',
          type: 'request',
          label: 'POST /payments/v1/charges',
          description: 'Commerce Hub charge request payload',
          data: result.requestPayload,
          isSimulated: result.simulated,
        });
      }
      addDebug({
        category: 'commerce-hub-api',
        type: 'response',
        label: `Commerce Hub: ${result.responseMessage || 'APPROVED'}`,
        description: result.simulated ? 'Sandbox simulation — Transaction approved' : 'Live Commerce Hub response',
        data: result.raw || result,
        duration: Date.now() - start,
        isSimulated: result.simulated,
      });

      setStep('done');
      await new Promise((r) => setTimeout(r, 1000));

      onComplete({
        success: true,
        orderId: result.orderId || `HT-DEMO-${Date.now()}`,
        shippingAddress: isExpress
          ? {
              givenName: address.givenName,
              familyName: address.familyName,
              locality: address.locality,
              administrativeArea: address.administrativeArea,
              postalCode: address.postalCode,
              countryCode: address.countryCode,
            }
          : undefined,
        shippingMethod: isExpress ? shippingMethods[selectedShipping] : undefined,
      });
    } catch (err) {
      addDebug({
        category: 'commerce-hub-api',
        type: 'response',
        label: 'Payment Error',
        data: { error: String(err) },
        duration: Date.now() - start,
      });
      setStep('done');
      onComplete({ success: false });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-[100] backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[101] animate-slide-up">
        <div className="bg-[#1c1c1e] rounded-t-2xl overflow-hidden shadow-2xl border border-[#38383a]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#38383a]">
            <button onClick={onClose} className="text-[#0a84ff] text-sm font-medium">
              Cancel
            </button>
            <div className="text-center">
              <div className="text-white text-sm font-semibold flex items-center justify-center gap-0.5">
                <svg viewBox="0 0 17 20" width="14" height="16" fill="white" aria-hidden="true" style={{ marginTop: '-1px' }}>
                  <path d="M12.8 0c.1 1.2-.4 2.4-1.1 3.3-.8 1-2 1.6-3.1 1.5-.2-1.2.4-2.4 1.1-3.2C10.4.7 11.7.1 12.8 0zM16.3 14.6c-.4.9-.6 1.3-1.1 2.1-.7 1.1-1.7 2.5-3 2.5-1.1 0-1.4-.7-3-.7-1.5 0-1.9.7-3.1.7-1.2 0-2.1-1.2-2.9-2.4C1.6 14.2.9 10.8 2.3 8.5c1-1.5 2.5-2.5 4.1-2.5 1.4 0 2.3.8 3.4.8 1.1 0 1.8-.8 3.3-.8 1.4 0 2.7.8 3.6 2.1-3.2 1.7-2.6 6.2.6 7.5z"/>
                </svg>
                <span style={{ fontWeight: 600 }}>Pay</span>
              </div>
              <div className="text-[#8e8e93] text-xs">{merchantName}</div>
            </div>
            <div className="w-14" />
          </div>

          {/* Content */}
          <div className="max-h-[70vh] overflow-y-auto">
            {/* Authenticating State */}
            {step === 'authenticating' && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#0a84ff]/20 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" strokeWidth="2">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                    <path d="M12 6v2m0 8v2m-4-6h2m8 0h2" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <p className="text-white text-lg font-medium">Confirm with Face ID</p>
                <p className="text-[#8e8e93] text-sm mt-1">Double-click to pay</p>
                <div className="mt-4 flex justify-center">
                  <div className="w-6 h-6 border-2 border-[#0a84ff] border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
            )}

            {/* Processing State */}
            {step === 'processing' && (
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 border-2 border-[#0a84ff] border-t-transparent rounded-full animate-spin" />
                <p className="text-white text-lg font-medium">Processing Payment...</p>
                <p className="text-[#8e8e93] text-sm mt-1">Connecting to Fiserv Commerce Hub</p>
              </div>
            )}

            {/* Done State */}
            {step === 'done' && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#30d158]/20 flex items-center justify-center text-3xl">
                  ✓
                </div>
                <p className="text-[#30d158] text-lg font-medium">Done</p>
              </div>
            )}

            {/* Address Selection (Express only) */}
            {step === 'address' && isExpress && (
              <div className="p-4">
                <h3 className="text-[#8e8e93] text-xs font-semibold uppercase tracking-wide mb-3">
                  Shipping Address
                </h3>
                <div className="space-y-2">
                  {TEST_ADDRESSES.map((addr, i) => (
                    <button
                      key={i}
                      onClick={() => handleAddressSelect(i)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selectedAddress === i
                          ? 'border-[#0a84ff] bg-[#0a84ff]/10'
                          : 'border-[#38383a] bg-[#2c2c2e] hover:border-[#48484a]'
                      }`}
                    >
                      <p className="text-white text-sm font-medium">{addr.label}</p>
                      <p className="text-[#8e8e93] text-xs mt-0.5">
                        {addr.addressLines[0]}, {addr.locality}, {addr.administrativeArea} {addr.postalCode}
                      </p>
                    </button>
                  ))}
                </div>
                {loading && (
                  <div className="flex items-center justify-center py-4 gap-2">
                    <div className="w-4 h-4 border-2 border-[#0a84ff] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[#8e8e93] text-sm">Calculating shipping...</span>
                  </div>
                )}
              </div>
            )}

            {/* Shipping Method Selection */}
            {step === 'shipping' && isExpress && (
              <div className="p-4">
                <div className="mb-4 p-3 bg-[#2c2c2e] rounded-xl border border-[#38383a]">
                  <p className="text-[#8e8e93] text-xs">Ship to</p>
                  <p className="text-white text-sm">{address.label}</p>
                </div>

                <h3 className="text-[#8e8e93] text-xs font-semibold uppercase tracking-wide mb-3">
                  Shipping Method
                </h3>
                <div className="space-y-2">
                  {shippingMethods.map((method, i) => (
                    <button
                      key={method.id}
                      onClick={() => handleShippingSelect(i)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selectedShipping === i
                          ? 'border-[#0a84ff] bg-[#0a84ff]/10'
                          : 'border-[#38383a] bg-[#2c2c2e] hover:border-[#48484a]'
                      }`}
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">{method.label}</p>
                          <p className="text-[#8e8e93] text-xs">{method.detail}</p>
                        </div>
                        <p className="text-white text-sm font-medium">${method.amount.toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setStep('review')}
                  className="w-full mt-4 bg-[#0a84ff] text-white py-3 rounded-xl font-medium text-sm"
                >
                  Continue
                </button>

                <button
                  onClick={() => setStep('address')}
                  className="w-full mt-2 text-[#0a84ff] py-2 text-sm"
                >
                  Change Address
                </button>
              </div>
            )}

            {/* Review & Pay */}
            {step === 'review' && (
              <div className="p-4">
                {/* Card Selection */}
                <h3 className="text-[#8e8e93] text-xs font-semibold uppercase tracking-wide mb-3">
                  Payment Card
                </h3>
                <div className="space-y-2 mb-4">
                  {TEST_CARDS.map((card, i) => (
                    <button
                      key={i}
                      onClick={() => handleCardSelect(i)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                        selectedCard === i
                          ? 'border-[#0a84ff] bg-[#0a84ff]/10'
                          : 'border-[#38383a] bg-[#2c2c2e] hover:border-[#48484a]'
                      }`}
                    >
                      <div className="w-8 h-5 bg-[#48484a] rounded flex items-center justify-center text-[10px] text-white font-bold">
                        {card.brand === 'visa' ? 'V' : card.brand === 'mastercard' ? 'MC' : 'AX'}
                      </div>
                      <span className="text-white text-sm">{card.label}</span>
                      {selectedCard === i && (
                        <span className="ml-auto text-[#0a84ff]">✓</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Recurring info */}
                {isRecurring && recurringDescription && (
                  <div className="mb-4 p-3 bg-[#2c2c2e] rounded-xl border border-[#38383a]">
                    <p className="text-[#8e8e93] text-xs">Recurring Payment</p>
                    <p className="text-white text-sm">{recurringDescription}</p>
                  </div>
                )}

                {/* Coupon Code */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 bg-[#2c2c2e] border border-[#38383a] rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#8e8e93]"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      className="bg-[#0a84ff] text-white px-4 py-2.5 rounded-xl text-sm font-medium"
                    >
                      Apply
                    </button>
                  </div>
                  {couponMessage && (
                    <p className={`text-xs mt-1.5 ${couponValid ? 'text-[#30d158]' : 'text-[#ff453a]'}`}>
                      {couponMessage}
                    </p>
                  )}
                </div>

                {/* Line Items */}
                <div className="mb-4 p-3 bg-[#2c2c2e] rounded-xl border border-[#38383a]">
                  {lineItems.map((item, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span className="text-[#8e8e93] text-sm">{item.label}</span>
                      <span className={`text-sm ${parseFloat(item.amount) < 0 ? 'text-[#30d158]' : 'text-white'}`}>
                        {parseFloat(item.amount) < 0 ? '-' : ''}${Math.abs(parseFloat(item.amount)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 mt-1 border-t border-[#38383a] font-semibold">
                    <span className="text-white text-sm">Total</span>
                    <span className="text-white text-sm">${total.toFixed(2)}</span>
                  </div>
                </div>

                {isExpress && (
                  <button
                    onClick={() => setStep('shipping')}
                    className="w-full mb-3 text-[#0a84ff] py-2 text-sm"
                  >
                    Change Shipping
                  </button>
                )}

                {/* Pay Button */}
                <button
                  onClick={handleAuthorize}
                  className="w-full bg-white text-black py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"
                >
                  <span>Pay with</span>
                  <svg viewBox="0 0 17 20" width="17" height="20" fill="black" aria-hidden="true" style={{ verticalAlign: 'middle', marginTop: '-2px' }}>
                    <path d="M12.8 0c.1 1.2-.4 2.4-1.1 3.3-.8 1-2 1.6-3.1 1.5-.2-1.2.4-2.4 1.1-3.2C10.4.7 11.7.1 12.8 0zM16.3 14.6c-.4.9-.6 1.3-1.1 2.1-.7 1.1-1.7 2.5-3 2.5-1.1 0-1.4-.7-3-.7-1.5 0-1.9.7-3.1.7-1.2 0-2.1-1.2-2.9-2.4C1.6 14.2.9 10.8 2.3 8.5c1-1.5 2.5-2.5 4.1-2.5 1.4 0 2.3.8 3.4.8 1.1 0 1.8-.8 3.3-.8 1.4 0 2.7.8 3.6 2.1-3.2 1.7-2.6 6.2.6 7.5z"/>
                  </svg>
                  <span style={{ fontWeight: 700 }}>Pay</span>
                  <span className="ml-1">${total.toFixed(2)}</span>
                </button>

                <p className="text-[#8e8e93] text-[10px] text-center mt-3">
                  Secured by Apple Pay
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translate(-50%, 100%); }
          to { transform: translate(-50%, 0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
