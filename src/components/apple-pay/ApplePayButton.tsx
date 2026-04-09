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
      onPaymentMethodSelected: async (event) => {
        const method = event.paymentMethod;
        addDebug({
          category: 'apple-pay-callback',
          type: 'event',
          label: 'onpaymentmethodselected',
          description: `Card changed to ${method?.displayName || 'unknown'} (${method?.network || ''} ${method?.type || ''})`,
          data: method,
        });
        // Return current totals — adjust here if pricing differs by card type
        return {
          newLineItems: items.map((item) => ({
            label: item.label,
            amount: item.amount,
            type: 'final' as const,
          })),
          newTotal: {
            label: DEFAULT_APPLE_PAY_CONFIG.merchantName,
            amount: total.toFixed(2),
            type: isExpress ? 'pending' : 'final',
          },
        };
      },

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

      onCouponCodeChanged: async (event) => {
        const couponCode = event.couponCode?.toUpperCase().trim();
        addDebug({
          category: 'apple-pay-callback',
          type: 'event',
          label: 'oncouponcodechanged',
          description: `Validating coupon: "${couponCode}"`,
          data: { couponCode },
        });

        // Demo coupon codes
        if (couponCode === 'HOTTOPIC20') {
          const discount = Math.round(total * 0.2 * 100) / 100;
          return {
            newLineItems: [
              ...items.map((item) => ({ label: item.label, amount: item.amount, type: 'final' as const })),
              { label: 'Discount (20% off)', amount: (-discount).toFixed(2), type: 'final' as const },
            ],
            newTotal: {
              label: DEFAULT_APPLE_PAY_CONFIG.merchantName,
              amount: (total - discount).toFixed(2),
              type: isExpress ? 'pending' : 'final',
            },
          };
        }
        if (couponCode === 'FREESHIP') {
          return {
            newLineItems: [
              ...items.map((item) => ({ label: item.label, amount: item.amount, type: 'final' as const })),
              { label: 'Free Shipping', amount: '0.00', type: 'final' as const },
            ],
            newTotal: {
              label: DEFAULT_APPLE_PAY_CONFIG.merchantName,
              amount: total.toFixed(2),
              type: isExpress ? 'pending' : 'final',
            },
          };
        }
        // Invalid coupon
        return {
          newTotal: {
            label: DEFAULT_APPLE_PAY_CONFIG.merchantName,
            amount: total.toFixed(2),
            type: isExpress ? 'pending' : 'final',
          },
          errors: [{ code: 'couponCodeInvalid', message: `Coupon "${couponCode}" is not valid` }],
        };
      },

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

  // Apple logo as clean inline SVG — well-tested viewBox, no clipping
  const appleLogoSvg = (
    <svg viewBox="0 0 17 20" width="17" height="20" fill="currentColor" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', marginTop: '-2px' }}>
      <path d="M12.8 0c.1 1.2-.4 2.4-1.1 3.3-.8 1-2 1.6-3.1 1.5-.2-1.2.4-2.4 1.1-3.2C10.4.7 11.7.1 12.8 0zM16.3 14.6c-.4.9-.6 1.3-1.1 2.1-.7 1.1-1.7 2.5-3 2.5-1.1 0-1.4-.7-3-.7-1.5 0-1.9.7-3.1.7-1.2 0-2.1-1.2-2.9-2.4C1.6 14.2.9 10.8 2.3 8.5c1-1.5 2.5-2.5 4.1-2.5 1.4 0 2.3.8 3.4.8 1.1 0 1.8-.8 3.3-.8 1.4 0 2.7.8 3.6 2.1-3.2 1.7-2.6 6.2.6 7.5z"/>
    </svg>
  );

  const buttonLabel = buttonType === 'plain' ? '' :
    buttonType === 'buy' ? 'Buy with ' :
    buttonType === 'check-out' ? 'Check out with ' :
    buttonType === 'subscribe' ? 'Subscribe with ' :
    buttonType === 'donate' ? 'Donate with ' :
    buttonType === 'continue' ? 'Continue with ' :
    buttonType === 'set-up' ? 'Set up ' : '';

  return (
    <div className={className}>
      {/*
        Apple Pay button — three-tier rendering:
        Tier 1 (Safari): CSS -webkit-appearance: -apple-pay-button renders native button
        Tier 2 (Non-Safari): Clean text "Buy with  Pay" using inline Apple logo SVG
        The CSS class handles the tier switching via @supports
      */}
      <button
        onClick={handleClick}
        disabled={processing}
        className={`apple-pay-btn ${buttonColor} w-full`}
        data-type={buttonType}
        style={{
          borderRadius: `${cornerRadius}px`,
          minHeight: `${btnHeight}px`,
          width: style?.width || '100%',
        }}
        aria-label="Pay with Apple Pay"
      >
        {/* Text content — hidden on Safari by CSS (font-size: 0), visible elsewhere */}
        {processing ? (
          <span>Processing...</span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
            {buttonLabel}{appleLogoSvg}<span style={{ fontWeight: 600 }}> Pay</span>
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
