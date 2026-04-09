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
  const addDebug = useDebug((s) => s.addEntry);

  useEffect(() => {
    if (open) {
      setStep(isExpress ? 'address' : 'review');
      setSelectedAddress(0);
      setSelectedCard(0);
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
      type: 'request',
      label: 'Simulated: shippingContactSelected',
      data: { countryCode: addr.countryCode, administrativeArea: addr.administrativeArea },
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
        type: 'response',
        label: 'Shipping Calculation Response',
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
      addDebug({ type: 'response', label: 'Shipping Error', data: { error: String(err) } });
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
    const shipping = shippingMethods[index]?.amount || 0;
    const newTotal = initialTotal + shipping + tax;
    setTotal(newTotal);
    setLineItems([
      ...initialLineItems,
      { label: 'Shipping', amount: shipping.toFixed(2) },
      { label: 'Tax', amount: tax.toFixed(2) },
    ]);
  };

  const handleAuthorize = async () => {
    setStep('authenticating');

    addDebug({
      type: 'event',
      label: 'Simulated: Touch ID / Face ID',
      data: { card: TEST_CARDS[selectedCard].label },
    });

    // Simulate biometric delay
    await new Promise((r) => setTimeout(r, 1500));

    setStep('processing');

    // Call Commerce Hub sandbox with test payment data
    addDebug({
      type: 'request',
      label: 'Commerce Hub: Process Payment',
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

      addDebug({
        type: 'response',
        label: 'Commerce Hub Response',
        data: result,
        duration: Date.now() - start,
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
              <div className="text-white text-sm font-semibold flex items-center gap-1.5">
                <svg viewBox="0 0 640 250" className="h-3.5 inline-block" fill="white">
                  <path d="M116.3 20.7C109.2 29.2 98 35.7 86.8 34.8C85.4 23.5 91.2 11.4 97.7 3.7C104.8-4.8 116.9-10.7 127-11.2C128.1 0.7 123.4 12.2 116.3 20.7ZM127 39.3C113.1 38.5 101.3 47.3 94.6 47.3C87.9 47.3 77.6 39.8 66.4 40C52.1 40.2 38.8 48.2 31.5 61C16.5 86.5 27.8 124.7 42.4 145.5C49.5 155.7 58 167.2 69.2 166.8C79.9 166.3 84.2 159.8 97.2 159.8C110.2 159.8 114.1 166.8 125.3 166.5C137 166.3 144.2 156.2 151.3 145.8C159.5 133.8 162.9 122.2 163.2 121.5C162.9 121.3 138.1 111.5 137.8 83.2C137.5 59.5 157.4 48.3 158.3 47.7C147.1 31.3 129.8 39.5 127 39.3Z"/>
                </svg>
                Pay
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
                      onClick={() => setSelectedCard(i)}
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

                {/* Line Items */}
                <div className="mb-4 p-3 bg-[#2c2c2e] rounded-xl border border-[#38383a]">
                  {lineItems.map((item, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span className="text-[#8e8e93] text-sm">{item.label}</span>
                      <span className="text-white text-sm">${item.amount}</span>
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
                  className="w-full bg-white text-black py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                >
                  Pay with
                  <svg viewBox="0 0 640 250" className="h-4 inline-block" fill="black">
                    <path d="M116.3 20.7C109.2 29.2 98 35.7 86.8 34.8C85.4 23.5 91.2 11.4 97.7 3.7C104.8-4.8 116.9-10.7 127-11.2C128.1 0.7 123.4 12.2 116.3 20.7ZM127 39.3C113.1 38.5 101.3 47.3 94.6 47.3C87.9 47.3 77.6 39.8 66.4 40C52.1 40.2 38.8 48.2 31.5 61C16.5 86.5 27.8 124.7 42.4 145.5C49.5 155.7 58 167.2 69.2 166.8C79.9 166.3 84.2 159.8 97.2 159.8C110.2 159.8 114.1 166.8 125.3 166.5C137 166.3 144.2 156.2 151.3 145.8C159.5 133.8 162.9 122.2 163.2 121.5C162.9 121.3 138.1 111.5 137.8 83.2C137.5 59.5 157.4 48.3 158.3 47.7C147.1 31.3 129.8 39.5 127 39.3Z"/>
                    <path d="M235.6 14.7V166H254.7V113.5H281.5C306 113.5 323.6 96.2 323.6 64C323.6 31.8 306.4 14.7 282.2 14.7H235.6ZM254.7 31.5H277.4C295 31.5 304.1 40.2 304.1 64.2C304.1 88 295 97 277.2 97H254.7V31.5Z"/>
                    <path d="M370.8 167.3C383.3 167.3 394.9 161 400.2 150.8H401V166H418.7V90.5C418.7 71 403 58 380 58C358.7 58 341.9 71.2 341.2 88.7H358.7C360.3 80 368.5 73.8 379.5 73.8C392.6 73.8 400 80.8 400 93.7V101.5L375.4 103C352.5 104.5 340 114.7 340 131.3C340 148.2 353 167.3 370.8 167.3ZM376.2 152C364.8 152 358.2 146 358.2 136.8C358.2 127.3 364.5 121.8 378.5 120.8L400 119.3V127.3C400 141.3 389.8 152 376.2 152Z"/>
                    <path d="M440.2 213.7H459.1V151.7H460.2C464.2 160.7 474.1 167.3 487.6 167.3C510.2 167.3 525.2 148 525.2 112C525.2 76 510 56.8 487.4 56.8C473.6 56.8 464 63.8 459.9 72.7H459.1V59H440.2V213.7ZM458.9 112.2C458.9 85.7 470.4 73.2 488.7 73.2C507.5 73.2 518.5 86.2 518.5 112.2C518.5 138.5 507.5 151.5 488.7 151.5C470.4 151.5 458.9 138.8 458.9 112.2Z"/>
                    <path d="M591.5 167.3C604 167.3 615.6 161 620.9 150.8H621.7V166H639.4V90.5C639.4 71 623.7 58 600.7 58C579.4 58 562.6 71.2 561.9 88.7H579.4C581 80 589.2 73.8 600.2 73.8C613.3 73.8 620.7 80.8 620.7 93.7V101.5L596.1 103C573.2 104.5 560.7 114.7 560.7 131.3C560.7 148.2 573.7 167.3 591.5 167.3ZM596.9 152C585.5 152 578.9 146 578.9 136.8C578.9 127.3 585.2 121.8 599.2 120.8L620.7 119.3V127.3C620.7 141.3 610.5 152 596.9 152Z"/>
                  </svg>
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
