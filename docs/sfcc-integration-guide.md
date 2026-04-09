# Apple Pay Express Checkout — SFCC + Fiserv Commerce Hub Integration Guide

## Overview

This guide covers enabling Apple Pay Express Checkout on Hot Topic's Salesforce Commerce Cloud (SFCC) storefront using the existing Fiserv Commerce Hub LINK cartridge. Express Checkout allows customers to complete purchases directly from the product detail page (PDP) or cart, without navigating to the checkout page.

## Architecture

### Standard Apple Pay (Current)
Checkout page → forms collect shipping/billing → payment sheet opens read-only → `authorizeOrderPayment()` → Commerce Hub → order placed.

### Express Checkout (New)
PDP or Cart → `prepareBasket()` → `getRequest()` → interactive payment sheet → `shippingContactSelected()` → `shippingMethodSelected()` → `authorizeOrderPayment()` → Commerce Hub → order placed.

## Prerequisites

- SFCC B2C Commerce 24.x+
- Fiserv Commerce Hub LINK cartridge installed
- Apple Developer account with merchant ID configured
- Apple Pay JS v14+

## Hook Implementations

### 1. Hook Registration

**package.json** (cartridge root):
```json
{ "hooks": "./hooks.json" }
```

**hooks.json**:
```json
{
  "dw.extensions.applepay.prepareBasket": "scripts/hooks/applePayExpress/prepareBasket.js",
  "dw.extensions.applepay.getRequest": "scripts/hooks/applePayExpress/getRequest.js",
  "dw.extensions.applepay.shippingContactSelected": "scripts/hooks/applePayExpress/shippingContactSelected.js",
  "dw.extensions.applepay.shippingMethodSelected": "scripts/hooks/applePayExpress/shippingMethodSelected.js",
  "dw.extensions.applepay.paymentMethodSelected": "scripts/hooks/applePayExpress/paymentMethodSelected.js",
  "dw.extensions.applepay.createOrder": "scripts/hooks/applePayExpress/createOrder.js",
  "dw.extensions.applepay.authorizeOrderPayment": "scripts/hooks/applePayExpress/authorizeOrderPayment.js",
  "dw.extensions.applepay.placeOrder": "scripts/hooks/applePayExpress/placeOrder.js",
  "dw.extensions.applepay.cancel": "scripts/hooks/applePayExpress/cancel.js"
}
```

**CRITICAL**: Cartridge must be in **site cartridge path**, not BM cartridge path, or hooks will not fire.

### 2. `prepareBasket` Hook

Creates basket context from PDP (SKU + quantity) or Cart (existing items).

```javascript
// prepareBasket.js
var Status = require('dw/system/Status');
var BasketMgr = require('dw/order/BasketMgr');
var Transaction = require('dw/system/Transaction');
var basketHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

exports.prepareBasket = function (basket, parameters) {
  Transaction.wrap(function () {
    if (parameters.sku) {
      // PDP source: add product to basket
      var ProductMgr = require('dw/catalog/ProductMgr');
      var product = ProductMgr.getProduct(parameters.sku);
      if (!product || !product.availabilityModel.inStock) {
        return new Status(Status.ERROR);
      }
      basket.createProductLineItem(product, basket.defaultShipment);
      basket.custom.applePayExpressOrigin = 'pdp';
    } else {
      // Cart source: basket already populated
      basket.custom.applePayExpressOrigin = 'cart';
    }
    basketHelpers.calculateTotals(basket);
  });
  return new Status(Status.OK);
};
```

### 3. `getRequest` Hook

Configures the payment sheet with required fields and initial estimates.

```javascript
// getRequest.js
var Status = require('dw/system/Status');

exports.getRequest = function (basket, request) {
  // CRITICAL: Without postalAddress, shipping events never fire
  request.requiredShippingContactFields = [
    'postalAddress', 'name', 'phone', 'email'
  ];
  request.requiredBillingContactFields = ['postalAddress'];

  request.lineItems = [
    { label: 'Subtotal', amount: basket.merchandizeTotalPrice.value.toFixed(2) },
    { label: 'Shipping (estimated)', amount: '5.99' },
    { label: 'Tax (estimated)', amount: '0.00' }
  ];

  request.total = {
    label: 'Hot Topic',
    amount: basket.totalGrossPrice.value.toFixed(2),
    type: 'pending' // Signals amounts may change
  };

  return new Status(Status.OK);
};
```

### 4. `shippingContactSelected` Hook

Recalculates shipping and tax when consumer selects/changes address. **Must complete < 3 seconds.**

```javascript
// shippingContactSelected.js
var Status = require('dw/system/Status');
var ShippingMgr = require('dw/order/ShippingMgr');
var Transaction = require('dw/system/Transaction');
var basketHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

exports.shippingContactSelected = function (basket, event, response) {
  var address = basket.defaultShipment.shippingAddress;
  var model = ShippingMgr.getShipmentShippingModel(basket.defaultShipment);
  var methods = model.applicableShippingMethods;

  if (methods.length === 0) {
    response.errors = [{
      code: 'shippingContactInvalid',
      contactField: 'postalAddress',
      message: 'Shipping is not available to this address.'
    }];
    return new Status(Status.ERROR);
  }

  Transaction.wrap(function () {
    basket.defaultShipment.setShippingMethod(methods[0]);
    basketHelpers.calculateTotals(basket);
  });

  response.shippingMethods = methods.toArray().map(function (m) {
    return {
      label: m.displayName,
      detail: m.description || '',
      amount: ShippingMgr.getShippingCost(model, m).amount.value.toFixed(2),
      identifier: m.ID
    };
  });

  response.lineItems = [
    { label: 'Subtotal', amount: basket.merchandizeTotalPrice.value.toFixed(2) },
    { label: 'Shipping', amount: basket.shippingTotalPrice.value.toFixed(2) },
    { label: 'Tax', amount: basket.totalTax.value.toFixed(2) }
  ];

  response.total = {
    label: 'Hot Topic',
    amount: basket.totalGrossPrice.value.toFixed(2),
    type: 'final'
  };

  return new Status(Status.OK);
};
```

### 5. `shippingMethodSelected` Hook

Updates totals when consumer selects a different shipping method.

```javascript
// shippingMethodSelected.js
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');
var basketHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

exports.shippingMethodSelected = function (basket, shippingMethod, event, response) {
  Transaction.wrap(function () {
    basketHelpers.calculateTotals(basket);
  });

  response.lineItems = [
    { label: 'Subtotal', amount: basket.merchandizeTotalPrice.value.toFixed(2) },
    { label: 'Shipping', amount: basket.shippingTotalPrice.value.toFixed(2) },
    { label: 'Tax', amount: basket.totalTax.value.toFixed(2) }
  ];

  response.total = {
    label: 'Hot Topic',
    amount: basket.totalGrossPrice.value.toFixed(2),
    type: 'final'
  };

  return new Status(Status.OK);
};
```

### 6. `cancel` Hook

Cleans up resources when the payment sheet is dismissed.

```javascript
// cancel.js
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');

exports.cancel = function (basket) {
  if (basket.custom.applePayExpressOrigin === 'pdp') {
    // Remove products added from PDP to prevent orphan baskets
    Transaction.wrap(function () {
      basket.productLineItems.toArray().forEach(function (pli) {
        basket.removeProductLineItem(pli);
      });
    });
  }
  return new Status(Status.OK);
};
```

### 7. `authorizeOrderPayment` Hook (Existing — No Changes)

The existing Commerce Hub authorization hook handles Express the same as Standard. The encrypted Apple Pay token is sent via `walletPaymentMethod.encryptedApplePay`.

## ISML Template Integration

### Product Detail Page
```html
<div class="apple-pay-express-container">
    <isapplepay
        sku="${pdict.product.ID}"
        qty="1"
        class="apple-pay-express-pdp"
    />
</div>
```

### Cart Page
```html
<div class="apple-pay-express-container">
    <isapplepay
        cart="true"
        class="apple-pay-express-cart"
    />
</div>
```

### Mini-Cart
```html
<div class="apple-pay-express-minicart">
    <isapplepay
        cart="true"
        class="dw-apple-pay-mini-cart"
    />
</div>
```

### CSS
```css
.apple-pay-express-container { margin: 16px 0; }
.apple-pay-express-pdp,
.apple-pay-express-cart {
  --apple-pay-button-width: 100%;
  --apple-pay-button-height: 48px;
  --apple-pay-button-border-radius: 8px;
  --apple-pay-button-type: buy;
}
```

## Business Manager Configuration

### Custom Site Preferences

| Attribute | Type | Default | Description |
|---|---|---|---|
| `applePayExpressEnabled` | Boolean | `false` | Master toggle |
| `applePayExpressPDP` | Boolean | `true` | Show on PDP |
| `applePayExpressCart` | Boolean | `true` | Show on cart |
| `applePayExpressMiniCart` | Boolean | `false` | Show in mini-cart |
| `applePayExpressDefaultShipMethod` | String | `standard` | Default method ID |
| `applePayExpressMerchantLabel` | String | (site name) | Label in payment sheet |

### Cartridge Path

Place in site cartridge path:
```
Business Manager > Administration > Sites > [Site] > Settings > Cartridges
```
Pattern: `int_commercehub_applepay:app_storefront_base:...`

## Error Handling

| Scenario | Hook | Response | Consumer Experience |
|---|---|---|---|
| Product OOS | `prepareBasket` | `Status.ERROR` | Sheet does not open |
| No shipping to address | `shippingContactSelected` | `shippingContactInvalid` | "Shipping not available" |
| Tax timeout | `shippingContactSelected` | Return $0 tax + `pending` | Recalculates on retry |
| Payment declined | `authorizeOrderPayment` | `Status.ERROR` | "Payment not completed" |

## Performance Targets

| Operation | Target |
|---|---|
| `shippingContactSelected` | < 3 seconds |
| `shippingMethodSelected` | < 1 second |
| Tax calculation | < 2 seconds |

## Rollback

**Immediate** (no code deploy): Set `applePayExpressEnabled = false` in Business Manager. Express button hidden; Standard Apple Pay unaffected.

**Code-level**: Revert to prior cartridge version. Express hooks are additive; removing them does not affect existing `authorizeOrderPayment` hook.

## Testing Checklist

- [ ] PDP Express happy path (PDP → address → shipping → authorize)
- [ ] Cart Express happy path (Cart → address → shipping → authorize)
- [ ] Address change recalculation (CA high tax → OR no tax)
- [ ] Shipping method change (Standard → Express)
- [ ] Cancel from PDP (no orphan basket)
- [ ] Cancel from Cart (cart unchanged)
- [ ] Payment decline handling
- [ ] Standard Apple Pay regression (checkout flow unchanged)
- [ ] iPhone Safari (iOS 17+)
- [ ] Mac Safari (macOS Sonoma+)
- [ ] Chrome on iOS 18+ (third-party browser support)
