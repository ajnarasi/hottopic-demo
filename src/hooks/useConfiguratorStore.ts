'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PagePlacement,
  CheckoutMode,
  PaymentType,
  ButtonStyle,
  ButtonType,
} from '@/lib/types';
import { MERCHANT_IDS } from '@/lib/apple-pay-config';

interface ConfiguratorStore {
  buttonStyle: ButtonStyle;
  buttonType: ButtonType;
  cornerRadius: number;
  width: number;
  height: number;
  placement: PagePlacement;
  language: string;
  checkoutMode: CheckoutMode;
  paymentType: PaymentType;
  merchantId: string;
  recurringConfig: {
    billingDescription: string;
    amount: string;
    interval: string;
  };

  setButtonStyle: (style: ButtonStyle) => void;
  setButtonType: (type: ButtonType) => void;
  setCornerRadius: (radius: number) => void;
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  setPlacement: (placement: PagePlacement) => void;
  setLanguage: (language: string) => void;
  setCheckoutMode: (mode: CheckoutMode) => void;
  setPaymentType: (type: PaymentType) => void;
  setMerchantId: (id: string) => void;
  setRecurringConfig: (config: { billingDescription: string; amount: string; interval: string }) => void;
}

export const useConfiguratorStore = create<ConfiguratorStore>()(
  persist(
    (set) => ({
      buttonStyle: 'black',
      buttonType: 'buy',
      cornerRadius: 8,
      width: 300,
      height: 48,
      placement: 'pdp',
      language: 'en',
      checkoutMode: 'express',
      paymentType: 'one-time',
      merchantId: MERCHANT_IDS[0],
      recurringConfig: {
        billingDescription: 'Hot Topic VIP Monthly Box',
        amount: '29.99',
        interval: 'month',
      },

      setButtonStyle: (style) => set({ buttonStyle: style }),
      setButtonType: (type) => set({ buttonType: type }),
      setCornerRadius: (radius) => set({ cornerRadius: radius }),
      setWidth: (width) => set({ width }),
      setHeight: (height) => set({ height }),
      setPlacement: (placement) => set({ placement }),
      setLanguage: (language) => set({ language }),
      setCheckoutMode: (mode) => set({ checkoutMode: mode }),
      setPaymentType: (type) => set({ paymentType: type }),
      setMerchantId: (id) => set({ merchantId: id }),
      setRecurringConfig: (config) => set({ recurringConfig: config }),
    }),
    { name: 'hot-topic-configurator' }
  )
);
