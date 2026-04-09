'use client';

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_APPLE_PAY_CONFIG } from '@/lib/apple-pay-config';
import { useDebug } from '@/components/storefront/DebugPanel';

interface ApplePayLineItem {
  label: string;
  amount: string;
  type?: 'final' | 'pending';
}

interface ApplePayShippingMethod {
  label: string;
  detail: string;
  amount: string;
  identifier: string;
}

interface ApplePayPaymentRequest {
  countryCode: string;
  currencyCode: string;
  supportedNetworks: string[];
  merchantCapabilities: string[];
  total: { label: string; amount: string; type?: 'final' | 'pending' };
  lineItems?: ApplePayLineItem[];
  requiredShippingContactFields?: string[];
  requiredBillingContactFields?: string[];
  shippingMethods?: ApplePayShippingMethod[];
  shippingContact?: Record<string, unknown>;
  recurringPaymentRequest?: {
    paymentDescription: string;
    regularBilling: {
      label: string;
      amount: string;
      paymentTiming?: string;
      recurringPaymentIntervalUnit?: string;
      recurringPaymentIntervalCount?: number;
    };
    managementURL: string;
    tokenNotificationURL?: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApplePaySessionType = any;

export function useApplePay() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);
  const addDebug = useDebug((s) => s.addEntry);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('ApplePaySession' in window) {
      try {
        const canMake = (
          window as unknown as { ApplePaySession: { canMakePayments: () => boolean } }
        ).ApplePaySession.canMakePayments();
        setAvailable(canMake);
      } catch {
        setAvailable(false);
      }
    } else {
      setAvailable(false);
    }
  }, []);

  const startSession = useCallback(
    async (
      paymentRequest: ApplePayPaymentRequest,
      callbacks: {
        onShippingContactSelected?: (
          event: { shippingContact: Record<string, unknown> }
        ) => Promise<{
          newShippingMethods: ApplePayShippingMethod[];
          newLineItems: ApplePayLineItem[];
          newTotal: { label: string; amount: string; type?: string };
          errors?: unknown[];
        }>;
        onShippingMethodSelected?: (
          event: { shippingMethod: ApplePayShippingMethod }
        ) => Promise<{
          newLineItems: ApplePayLineItem[];
          newTotal: { label: string; amount: string; type?: string };
        }>;
        onPaymentAuthorized: (
          event: { payment: { token: { paymentData: unknown }; shippingContact?: unknown; billingContact?: unknown } }
        ) => Promise<{ status: number }>;
        onCancel?: () => void;
      }
    ) => {
      if (!available) return;

      setProcessing(true);
      addDebug({
        type: 'event',
        label: 'ApplePaySession: Creating',
        data: paymentRequest,
      });

      try {
        const ApplePaySession = (window as unknown as { ApplePaySession: new (version: number, request: ApplePayPaymentRequest) => ApplePaySessionType }).ApplePaySession;
        const session: ApplePaySessionType = new ApplePaySession(
          DEFAULT_APPLE_PAY_CONFIG.apiVersion,
          paymentRequest
        );

        // Merchant Validation
        session.onvalidatemerchant = async (event: { validationURL: string }) => {
          addDebug({
            type: 'event',
            label: 'onvalidatemerchant',
            data: { validationURL: event.validationURL },
          });

          const start = Date.now();
          try {
            const res = await fetch('/api/apple-pay/validate-merchant', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ validationURL: event.validationURL }),
            });
            const merchantSession = await res.json();

            addDebug({
              type: 'response',
              label: 'Merchant Validation Response',
              data: merchantSession,
              duration: Date.now() - start,
            });

            session.completeMerchantValidation(merchantSession);
          } catch (err) {
            addDebug({
              type: 'response',
              label: 'Merchant Validation Error',
              data: { error: String(err) },
              duration: Date.now() - start,
            });
            session.abort();
            setProcessing(false);
          }
        };

        // Shipping Contact Selected
        if (callbacks.onShippingContactSelected) {
          session.onshippingcontactselected = async (event: { shippingContact: Record<string, unknown> }) => {
            addDebug({
              type: 'event',
              label: 'onshippingcontactselected',
              data: event.shippingContact,
            });

            const start = Date.now();
            const result = await callbacks.onShippingContactSelected!(event);

            addDebug({
              type: 'response',
              label: 'Shipping Contact Update',
              data: result,
              duration: Date.now() - start,
            });

            if (result.errors && result.errors.length > 0) {
              session.completeShippingContactSelection({
                errors: result.errors,
                newShippingMethods: [],
                newLineItems: result.newLineItems,
                newTotal: result.newTotal,
              });
            } else {
              session.completeShippingContactSelection({
                newShippingMethods: result.newShippingMethods,
                newLineItems: result.newLineItems,
                newTotal: result.newTotal,
              });
            }
          };
        }

        // Shipping Method Selected
        if (callbacks.onShippingMethodSelected) {
          session.onshippingmethodselected = async (event: { shippingMethod: ApplePayShippingMethod }) => {
            addDebug({
              type: 'event',
              label: 'onshippingmethodselected',
              data: event.shippingMethod,
            });

            const result = await callbacks.onShippingMethodSelected!(event);
            session.completeShippingMethodSelection({
              newLineItems: result.newLineItems,
              newTotal: result.newTotal,
            });
          };
        }

        // Payment Authorized
        session.onpaymentauthorized = async (event: { payment: { token: { paymentData: unknown }; shippingContact?: unknown; billingContact?: unknown } }) => {
          addDebug({
            type: 'event',
            label: 'onpaymentauthorized',
            data: {
              tokenData: '(encrypted)',
              shippingContact: event.payment.shippingContact,
              billingContact: event.payment.billingContact,
            },
          });

          const start = Date.now();
          const result = await callbacks.onPaymentAuthorized(event);

          addDebug({
            type: 'response',
            label: 'Payment Authorization Result',
            data: { status: result.status },
            duration: Date.now() - start,
          });

          session.completePayment({ status: result.status });
          setProcessing(false);
        };

        // Cancel
        session.oncancel = () => {
          addDebug({
            type: 'event',
            label: 'Apple Pay Session Cancelled',
            data: {},
          });
          callbacks.onCancel?.();
          setProcessing(false);
        };

        session.begin();
      } catch (err) {
        addDebug({
          type: 'event',
          label: 'ApplePaySession Error',
          data: { error: String(err) },
        });
        setProcessing(false);
      }
    },
    [available, addDebug]
  );

  return { available, processing, startSession };
}
