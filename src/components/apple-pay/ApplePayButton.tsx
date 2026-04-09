'use client';

import { useState } from 'react';
import { useApplePay } from './useApplePay';
import { useUser } from '@/hooks/useUser';
import { useCart } from '@/hooks/useCart';
import { useConfiguratorStore } from '@/hooks/useConfiguratorStore';
import { DEFAULT_APPLE_PAY_CONFIG } from '@/lib/apple-pay-config';
import { useDebug } from '@/components/storefront/DebugPanel';
import { PagePlacement } from '@/lib/types';
import { useRouter } from 'next/navigation';
import SimulatedPaymentSheet from './SimulatedPaymentSheet';

interface ApplePayButtonProps {
  placement: PagePlacement;
  items: { label: string; amount: string }[];
  total: number;
  productId?: string;
  isSubscription?: boolean;
  subscriptionConfig?: {
    billingDescription: string;
    amount: string;
    intervalUnit: string;
    intervalCount: number;
  };
  style?: {
    color?: string;
    type?: string;
    cornerRadius?: number;
    width?: string;
    height?: number;
  };
  className?: string;
}

export default function ApplePayButton({
  placement,
  items,
  total,
  productId,
  isSubscription,
  subscriptionConfig,
  style,
  className = '',
}: ApplePayButtonProps) {
  const { available, processing, startSession } = useApplePay();
  const profile = useUser((s) => s.profile);
  const markPaymentCompleted = useUser((s) => s.markPaymentCompleted);
  const clearExpressBasket = useCart((s) => s.clearExpressBasket);
  const addDebug = useDebug((s) => s.addEntry);
  const configStore = useConfiguratorStore();
  const router = useRouter();
  const [showSimulated, setShowSimulated] = useState(false);

  const isExpress = placement !== 'checkout';

  const handleRealApplePay = () => {
    if (processing) return;

    const lineItems = items.map((item) => ({
      label: item.label,
      amount: item.amount,
      type: 'final' as const,
    }));

    const paymentRequest: Record<string, unknown> = {
      countryCode: DEFAULT_APPLE_PAY_CONFIG.countryCode,
      currencyCode: DEFAULT_APPLE_PAY_CONFIG.currencyCode,
      supportedNetworks: DEFAULT_APPLE_PAY_CONFIG.supportedNetworks,
      merchantCapabilities: DEFAULT_APPLE_PAY_CONFIG.merchantCapabilities,
      total: {
        label: DEFAULT_APPLE_PAY_CONFIG.merchantName,
        amount: total.toFixed(2),
        type: isExpress ? 'pending' : 'final',
      },
      lineItems,
    };

    if (isExpress) {
      paymentRequest.requiredShippingContactFields = [
        'postalAddress', 'name', 'phone', 'email',
      ];
      paymentRequest.requiredBillingContactFields = ['postalAddress'];

      if (profile.mode === 'returning' && profile.address) {
        paymentRequest.shippingContact = {
          givenName: profile.name?.split(' ')[0],
          familyName: profile.name?.split(' ').slice(1).join(' '),
          emailAddress: profile.email,
          phoneNumber: profile.phone,
          addressLines: profile.address.addressLines,
          locality: profile.address.locality,
          administrativeArea: profile.address.administrativeArea,
          postalCode: profile.address.postalCode,
          countryCode: profile.address.countryCode,
        };
      }
    } else {
      paymentRequest.requiredBillingContactFields = ['postalAddress'];
    }

    if (isSubscription && subscriptionConfig) {
      paymentRequest.recurringPaymentRequest = {
        paymentDescription: subscriptionConfig.billingDescription,
        regularBilling: {
          label: subscriptionConfig.billingDescription,
          amount: subscriptionConfig.amount,
          paymentTiming: 'recurring',
          recurringPaymentIntervalUnit: subscriptionConfig.intervalUnit,
          recurringPaymentIntervalCount: subscriptionConfig.intervalCount,
        },
        managementURL: `${window.location.origin}/account/subscriptions`,
        tokenNotificationURL: `${window.location.origin}/api/apple-pay/token-notification`,
      };
    }

    addDebug({
      category: 'internal-event',
      type: 'event',
      label: `prepareBasket → getRequest (${placement})`,
      description: 'Creating Apple Pay session with payment request. Basket prepared from page context.',
      data: paymentRequest,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startSession(paymentRequest as any, {
      onShippingContactSelected: isExpress
        ? async (event) => {
            const contact = event.shippingContact as Record<string, string>;
            const res = await fetch('/api/shipping/calculate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                countryCode: contact.countryCode,
                administrativeArea: contact.administrativeArea,
                postalCode: contact.postalCode,
              }),
            });
            const data = await res.json();

            if (data.error) {
              return {
                newShippingMethods: [],
                newLineItems: lineItems,
                newTotal: {
                  label: DEFAULT_APPLE_PAY_CONFIG.merchantName,
                  amount: total.toFixed(2),
                  type: 'pending',
                },
                errors: [{
                  code: 'shippingContactInvalid',
                  contactField: 'postalAddress',
                  message: data.error,
                }],
              };
            }

            const shippingAmount = data.methods[0]?.amount || 0;
            const tax = data.tax || 0;
            const newTotal = total + shippingAmount + tax;

            return {
              newShippingMethods: data.methods.map(
                (m: { id: string; label: string; detail: string; amount: number }) => ({
                  label: m.label, detail: m.detail,
                  amount: m.amount.toFixed(2), identifier: m.id,
                })
              ),
              newLineItems: [
                ...lineItems,
                { label: 'Shipping', amount: shippingAmount.toFixed(2), type: 'final' as const },
                { label: 'Tax', amount: tax.toFixed(2), type: 'final' as const },
              ],
              newTotal: {
                label: DEFAULT_APPLE_PAY_CONFIG.merchantName,
                amount: newTotal.toFixed(2), type: 'final',
              },
            };
          }
        : undefined,

      onShippingMethodSelected: isExpress
        ? async (event) => {
            const shippingAmount = parseFloat(event.shippingMethod.amount);
            const newTotal = total + shippingAmount;
            return {
              newLineItems: [
                ...lineItems,
                { label: 'Shipping', amount: shippingAmount.toFixed(2), type: 'final' as const },
              ],
              newTotal: {
                label: DEFAULT_APPLE_PAY_CONFIG.merchantName,
                amount: newTotal.toFixed(2), type: 'final',
              },
            };
          }
        : undefined,

      onPaymentAuthorized: async (event) => {
        const start = Date.now();
        try {
          const res = await fetch('/api/apple-pay/process-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentData: event.payment.token.paymentData,
              amount: total,
              currency: DEFAULT_APPLE_PAY_CONFIG.currencyCode,
              productId,
            }),
          });
          const result = await res.json();
          if (result.requestPayload) {
            addDebug({ category: 'commerce-hub-api', type: 'request', label: 'POST /payments/v1/charges', description: 'Commerce Hub charge request payload', data: result.requestPayload, isSimulated: result.simulated });
          }
          addDebug({ category: 'commerce-hub-api', type: 'response', label: 'Commerce Hub Response', description: result.simulated ? 'Sandbox simulation — APPROVED' : `${result.responseMessage || 'Response'}`, data: result.raw || result, duration: Date.now() - start, isSimulated: result.simulated });

          if (result.success) {
            markPaymentCompleted('applePay');
            clearExpressBasket();
            router.push(`/checkout?status=success&orderId=${result.orderId || 'DEMO-' + Date.now()}`);
            return { status: 0 };
          }
          return { status: 1 };
        } catch (err) {
          addDebug({ category: 'commerce-hub-api', type: 'response', label: 'Payment Processing Error', data: { error: String(err) }, duration: Date.now() - start });
          return { status: 1 };
        }
      },

      onCancel: () => { clearExpressBasket(); },
    });
  };

  const handleClick = () => {
    addDebug({
      category: 'internal-event',
      type: 'event',
      label: `prepareBasket → getRequest (${placement})`,
      description: `Initializing Apple Pay ${isExpress ? 'Express' : 'Standard'} checkout. ${available ? 'Native ApplePaySession.' : 'Simulated payment sheet.'}`,
      data: { placement, isExpress, total, items, nativeApplePay: !!available },
    });

    if (available) {
      handleRealApplePay();
    } else {
      setShowSimulated(true);
    }
  };

  const handleSimulatedComplete = (result: {
    success: boolean;
    orderId?: string;
  }) => {
    setShowSimulated(false);
    if (result.success) {
      markPaymentCompleted('applePay');
      clearExpressBasket();
      router.push(`/checkout?status=success&orderId=${result.orderId || 'DEMO-' + Date.now()}`);
    }
  };

  if (available === null) return null;

  const buttonColor = style?.color || configStore.buttonStyle || 'black';
  const buttonType = style?.type || configStore.buttonType || (isSubscription ? 'subscribe' : 'buy');
  const cornerRadius = style?.cornerRadius ?? configStore.cornerRadius ?? 8;
  const height = style?.height ?? configStore.height ?? 48;

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={processing}
        className="w-full rounded-lg transition-opacity disabled:opacity-50"
        style={{
          backgroundColor: buttonColor === 'black' ? '#000' : '#fff',
          color: buttonColor === 'black' ? '#fff' : '#000',
          border: buttonColor === 'white-outline' ? '1px solid #000' : 'none',
          borderRadius: `${cornerRadius}px`,
          height: `${height}px`,
          width: style?.width || '100%',
          cursor: processing ? 'wait' : 'pointer',
        }}
        aria-label="Pay with Apple Pay"
      >
        <span className="flex items-center justify-center gap-1 font-medium text-sm">
          {processing ? (
            'Processing...'
          ) : (
            <>
              {buttonType === 'buy' && 'Buy with'}
              {buttonType === 'check-out' && 'Check out with'}
              {buttonType === 'subscribe' && 'Subscribe with'}
              {buttonType === 'donate' && 'Donate with'}
              {buttonType === 'continue' && 'Continue with'}
              {buttonType === 'set-up' && 'Set up'}
              {buttonType === 'plain' && ''}
              {' '}
              <svg viewBox="0 0 640 250" className="h-5 inline-block" fill="currentColor">
                <path d="M116.3 20.7C109.2 29.2 98 35.7 86.8 34.8C85.4 23.5 91.2 11.4 97.7 3.7C104.8-4.8 116.9-10.7 127-11.2C128.1 0.7 123.4 12.2 116.3 20.7ZM127 39.3C113.1 38.5 101.3 47.3 94.6 47.3C87.9 47.3 77.6 39.8 66.4 40C52.1 40.2 38.8 48.2 31.5 61C16.5 86.5 27.8 124.7 42.4 145.5C49.5 155.7 58 167.2 69.2 166.8C79.9 166.3 84.2 159.8 97.2 159.8C110.2 159.8 114.1 166.8 125.3 166.5C137 166.3 144.2 156.2 151.3 145.8C159.5 133.8 162.9 122.2 163.2 121.5C162.9 121.3 138.1 111.5 137.8 83.2C137.5 59.5 157.4 48.3 158.3 47.7C147.1 31.3 129.8 39.5 127 39.3Z"/>
                <path d="M235.6 14.7V166H254.7V113.5H281.5C306 113.5 323.6 96.2 323.6 64C323.6 31.8 306.4 14.7 282.2 14.7H235.6ZM254.7 31.5H277.4C295 31.5 304.1 40.2 304.1 64.2C304.1 88 295 97 277.2 97H254.7V31.5Z"/>
                <path d="M370.8 167.3C383.3 167.3 394.9 161 400.2 150.8H401V166H418.7V90.5C418.7 71 403 58 380 58C358.7 58 341.9 71.2 341.2 88.7H358.7C360.3 80 368.5 73.8 379.5 73.8C392.6 73.8 400 80.8 400 93.7V101.5L375.4 103C352.5 104.5 340 114.7 340 131.3C340 148.2 353 167.3 370.8 167.3ZM376.2 152C364.8 152 358.2 146 358.2 136.8C358.2 127.3 364.5 121.8 378.5 120.8L400 119.3V127.3C400 141.3 389.8 152 376.2 152Z"/>
                <path d="M440.2 213.7H459.1V151.7H460.2C464.2 160.7 474.1 167.3 487.6 167.3C510.2 167.3 525.2 148 525.2 112C525.2 76 510 56.8 487.4 56.8C473.6 56.8 464 63.8 459.9 72.7H459.1V59H440.2V213.7ZM458.9 112.2C458.9 85.7 470.4 73.2 488.7 73.2C507.5 73.2 518.5 86.2 518.5 112.2C518.5 138.5 507.5 151.5 488.7 151.5C470.4 151.5 458.9 138.8 458.9 112.2Z"/>
                <path d="M591.5 167.3C604 167.3 615.6 161 620.9 150.8H621.7V166H639.4V90.5C639.4 71 623.7 58 600.7 58C579.4 58 562.6 71.2 561.9 88.7H579.4C581 80 589.2 73.8 600.2 73.8C613.3 73.8 620.7 80.8 620.7 93.7V101.5L596.1 103C573.2 104.5 560.7 114.7 560.7 131.3C560.7 148.2 573.7 167.3 591.5 167.3ZM596.9 152C585.5 152 578.9 146 578.9 136.8C578.9 127.3 585.2 121.8 599.2 120.8L620.7 119.3V127.3C620.7 141.3 610.5 152 596.9 152Z"/>
              </svg>
            </>
          )}
        </span>
      </button>

      {/* Simulated Payment Sheet (used when native ApplePaySession is not available) */}
      <SimulatedPaymentSheet
        open={showSimulated}
        onClose={() => setShowSimulated(false)}
        merchantName={DEFAULT_APPLE_PAY_CONFIG.merchantName}
        lineItems={items}
        total={total}
        isExpress={isExpress}
        isRecurring={isSubscription}
        recurringDescription={subscriptionConfig?.billingDescription}
        onComplete={handleSimulatedComplete}
      />
    </div>
  );
}
