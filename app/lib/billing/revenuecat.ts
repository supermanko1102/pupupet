import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

import { env } from '@/lib/env';

export const PLUS_MONTHLY_PRODUCT_ID = 'pupupet_plus_monthly_v1';

let configuredRevenueCatUserId: string | null = null;
let revenueCatConfigureInFlight: Promise<void> | null = null;

export function canUseRevenueCatPurchases() {
  return Platform.OS === 'ios' && !!env.revenueCatIosApiKey;
}

export async function configurePurchasesForUser(userId: string) {
  if (revenueCatConfigureInFlight) {
    await revenueCatConfigureInFlight;
  }

  revenueCatConfigureInFlight = (async () => {
    await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.WARN);

    const isConfigured = await Purchases.isConfigured().catch(() => false);
    if (!isConfigured) {
      Purchases.configure({
        apiKey: env.revenueCatIosApiKey,
        appUserID: userId,
      });
      configuredRevenueCatUserId = userId;
      return;
    }

    if (configuredRevenueCatUserId !== userId) {
      await Purchases.logIn(userId);
      configuredRevenueCatUserId = userId;
    }
  })();

  try {
    await revenueCatConfigureInFlight;
  } finally {
    revenueCatConfigureInFlight = null;
  }
}

export async function logRevenueCatProductDiagnostics() {
  if (!__DEV__ || Platform.OS !== 'ios') return;
  if (env.revenueCatIosApiKey.startsWith('test_')) {
    console.log('[RevenueCat] Using Test Store API key; skipping Apple StoreKit product diagnostics.');
    return;
  }

  try {
    const products = await Purchases.getProducts(
      [PLUS_MONTHLY_PRODUCT_ID],
      Purchases.PRODUCT_CATEGORY.SUBSCRIPTION,
    );
    const identifiers = products.map((product) => product.identifier).join(', ') || '(none)';
    console.log(`[RevenueCat] StoreKit product diagnostics: requested ${PLUS_MONTHLY_PRODUCT_ID}, received ${products.length}: ${identifiers}`);
  } catch (error) {
    console.warn('[RevenueCat] StoreKit product diagnostics failed:', error);
  }
}
