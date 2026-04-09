export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  category: string;
  sizes?: string[];
  colors?: string[];
  isSubscription?: boolean;
  subscriptionInterval?: string;
  subscriptionAmount?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface ShippingMethod {
  id: string;
  label: string;
  detail: string;
  amount: number;
}

export interface ShippingAddress {
  countryCode: string;
  stateCode: string;
  postalCode: string;
  city?: string;
}

export interface UserProfile {
  mode: 'guest' | 'first-time' | 'returning';
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    addressLines: string[];
    locality: string;
    administrativeArea: string;
    postalCode: string;
    countryCode: string;
  };
  previousPaymentMethod?: string;
}

export interface ApplePayConfig {
  merchantId: string;
  merchantName: string;
  supportedNetworks: string[];
  merchantCapabilities: string[];
  countryCode: string;
  currencyCode: string;
  apiVersion: number;
}

export interface CommerceHubConfig {
  apiKey: string;
  merchantId: string;
  terminalId: string;
  endpoint: string;
}

export type PagePlacement = 'pdp' | 'cart' | 'mini-cart' | 'checkout';
export type CheckoutMode = 'express' | 'standard';
export type PaymentType = 'one-time' | 'recurring';
export type ButtonStyle = 'black' | 'white' | 'white-outline';
export type ButtonType = 'buy' | 'check-out' | 'subscribe' | 'donate' | 'plain' | 'set-up' | 'continue';

export interface ConfiguratorState {
  placement: PagePlacement;
  buttonStyle: ButtonStyle;
  buttonType: ButtonType;
  cornerRadius: number;
  width: number;
  height: number;
  language: string;
  checkoutMode: CheckoutMode;
  paymentType: PaymentType;
  recurringConfig?: {
    billingDescription: string;
    amount: string;
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount: number;
    managementURL: string;
    tokenNotificationURL: string;
  };
  merchantId: string;
  supportedNetworks: string[];
  merchantCapabilities: string[];
}

export interface DebugEntry {
  timestamp: number;
  type: 'request' | 'response' | 'event';
  label: string;
  data: unknown;
  duration?: number;
}

export type TraceCategory =
  | 'apple-pay-callback'
  | 'commerce-hub-api'
  | 'internal-event'
  | 'shipping-api';

export interface TraceEntry {
  id: string;
  timestamp: number;
  category: TraceCategory;
  type: 'request' | 'response' | 'event';
  label: string;
  description?: string;
  data: unknown;
  duration?: number;
  isSimulated?: boolean;
  step?: number;
}
