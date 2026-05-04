export const DEFAULT_PLUS_ENTITLEMENT_ID = 'plus';
const LEGACY_PLUS_ENTITLEMENT_ID = 'entlabef9aca35';

export type RevenueCatEntitlement = {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  product_identifier?: string | null;
  purchase_date?: string | null;
};

export function getPlusEntitlementCandidates(configuredEntitlementId?: string | null) {
  return [
    configuredEntitlementId?.trim(),
    DEFAULT_PLUS_ENTITLEMENT_ID,
    LEGACY_PLUS_ENTITLEMENT_ID,
  ].filter((value, index, values): value is string => !!value && values.indexOf(value) === index);
}

export function findPlusEntitlement(
  entitlements: Record<string, RevenueCatEntitlement | undefined> | undefined,
  configuredEntitlementId?: string | null
) {
  if (!entitlements) return { entitlement: null, entitlementId: null };

  for (const entitlementId of getPlusEntitlementCandidates(configuredEntitlementId)) {
    const entitlement = entitlements[entitlementId];
    if (entitlement) {
      return { entitlement, entitlementId };
    }
  }

  return { entitlement: null, entitlementId: null };
}
