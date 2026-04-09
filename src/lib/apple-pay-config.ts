import { ApplePayConfig } from './types';

export const MERCHANT_IDS = [
  'merchant.app.vercel.hottopic',
  'merchant.fiserv.billmatrixCH4.0stagect',
  'merchant.com.us.fiserv.carat.commhubcert.2d7c44572e',
  'merchant.com.us.fiserv.carat.commercehub',
] as const;

export const DEFAULT_APPLE_PAY_CONFIG: ApplePayConfig = {
  merchantId: process.env.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID || MERCHANT_IDS[0],
  merchantName: 'Hot Topic',
  supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
  merchantCapabilities: ['supports3DS', 'supportsCredit', 'supportsDebit'],
  countryCode: 'US',
  currencyCode: 'USD',
  apiVersion: 14,
};

export const APPLE_PAY_BUTTON_STYLES = {
  colors: ['black', 'white', 'white-outline'] as const,
  types: [
    'buy',
    'check-out',
    'subscribe',
    'donate',
    'plain',
    'set-up',
    'continue',
  ] as const,
  languages: [
    { code: 'en', label: 'English' },
    { code: 'en-US', label: 'English (US)' },
    { code: 'fr-FR', label: 'French' },
    { code: 'de-DE', label: 'German' },
    { code: 'es-ES', label: 'Spanish' },
    { code: 'it-IT', label: 'Italian' },
    { code: 'ja', label: 'Japanese' },
    { code: 'zh-CN', label: 'Chinese (Simplified)' },
    { code: 'ko', label: 'Korean' },
    { code: 'pt-BR', label: 'Portuguese (Brazil)' },
  ] as const,
};
