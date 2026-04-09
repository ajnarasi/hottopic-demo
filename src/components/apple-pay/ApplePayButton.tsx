'use client';

import { useState, useEffect } from 'react';
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

      onCancel: () => {
        clearExpressBasket();
        addDebug({
          category: 'internal-event',
          type: 'event',
          label: 'Apple Pay session ended',
          description: 'Session was cancelled or failed. Click Apple Pay again to use the demo payment sheet.',
          data: {},
        });
      },
    });
  };

  // Check if Apple Pay JS SDK is loaded (provides <apple-pay-button> web component)
  const [sdkLoaded, setSdkLoaded] = useState(false);
  useEffect(() => {
    const check = () => {
      if (typeof window !== 'undefined' && 'ApplePaySession' in window) {
        setSdkLoaded(true);
      }
    };
    check();
    // Re-check after SDK loads (async script)
    const timer = setTimeout(check, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Track if real session was attempted — after first attempt, always use simulated
  const [realSessionAttempted, setRealSessionAttempted] = useState(false);

  const handleClick = () => {
    const hasApplePaySession = typeof window !== 'undefined' && 'ApplePaySession' in window;

    addDebug({
      category: 'internal-event',
      type: 'event',
      label: `prepareBasket → getRequest (${placement})`,
      description: `Initializing Apple Pay ${isExpress ? 'Express' : 'Standard'} checkout. ${hasApplePaySession && !realSessionAttempted ? 'Starting real ApplePaySession.' : 'Presenting Apple Pay payment sheet.'}`,
      data: { placement, isExpress, total, items, realApplePay: hasApplePaySession && !realSessionAttempted },
    });

    if (hasApplePaySession && !realSessionAttempted) {
      // First click: try real Apple Pay — shows native sheet on Safari, scannable code on Chrome
      setRealSessionAttempted(true);
      handleRealApplePay();
    } else {
      // SDK not loaded or real session already attempted — show simulated sheet
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

  // Read configurator store values reactively
  const cfgButtonStyle = useConfiguratorStore((s) => s.buttonStyle);
  const cfgButtonType = useConfiguratorStore((s) => s.buttonType);
  const cfgCornerRadius = useConfiguratorStore((s) => s.cornerRadius);
  const cfgHeight = useConfiguratorStore((s) => s.height);

  const buttonColor = style?.color || cfgButtonStyle || 'black';
  const buttonType = style?.type || cfgButtonType || (isSubscription ? 'subscribe' : 'buy');
  const cornerRadius = style?.cornerRadius ?? cfgCornerRadius ?? 8;
  const btnHeight = style?.height ?? cfgHeight ?? 48;

  return (
    <div className={className}>
      {/* CSS fallback button — always visible, handles click */}
      <button
        onClick={handleClick}
        disabled={processing}
        className={`apple-pay-fallback-btn ${buttonColor} w-full transition-opacity disabled:opacity-50`}
        style={{
          borderRadius: `${cornerRadius}px`,
          height: `${btnHeight}px`,
          width: style?.width || '100%',
          cursor: processing ? 'wait' : 'pointer',
        }}
        aria-label="Pay with Apple Pay"
      >
        {processing ? (
          <span className="text-sm">Processing...</span>
        ) : (
          <span className="flex items-center justify-center gap-1 text-sm font-medium">
            {buttonType !== 'plain' && (
              <span>
                {buttonType === 'buy' ? 'Buy with' :
                 buttonType === 'check-out' ? 'Check out with' :
                 buttonType === 'subscribe' ? 'Subscribe with' :
                 buttonType === 'donate' ? 'Donate with' :
                 buttonType === 'continue' ? 'Continue with' :
                 buttonType === 'set-up' ? 'Set up' : ''}
              </span>
            )}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-[18px] w-auto" fill="currentColor" aria-hidden="true">
              <path d="M17.72 5.011H8.018c-.434 0-.857.172-1.166.48-.31.309-.481.731-.481 1.17v10.667c0 .438.172.862.481 1.17.309.309.732.48 1.166.48h9.702c.434 0 .857-.171 1.166-.48.31-.308.481-.732.481-1.17V6.661c0-.439-.171-.861-.481-1.17a1.647 1.647 0 00-1.166-.48z" fill="none"/>
              <path d="M7.078 10.615c-.2.39-.315.855-.315 1.369 0 1.762 1.231 3.554 2.793 3.554.466 0 .802-.151 1.093-.286.262-.121.483-.223.856-.223.38 0 .601.104.863.226.291.136.627.283 1.086.283.787 0 1.397-.593 1.884-1.275a6.537 6.537 0 00.749-1.397c-1.06-.466-1.434-2.053-.44-3.054-.508-.62-1.216-.96-1.879-.96-.446 0-.783.143-1.073.267-.254.109-.47.201-.793.201-.33 0-.556-.094-.82-.205-.295-.124-.633-.266-1.104-.266-.694 0-1.398.393-1.9 1.066z"/>
              <path d="M12.392 7.295c.51-.588.765-1.306.705-2.037-.694.053-1.388.382-1.868.914-.442.487-.74 1.2-.667 1.928.735.037 1.369-.299 1.83-.805z"/>
            </svg>
            <span className="font-semibold -ml-0.5">Pay</span>
          </span>
        )}
      </button>

      {/* Simulated Payment Sheet — fallback when real Apple Pay session can't start */}
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
