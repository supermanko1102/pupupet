import { describe, expect, it } from 'vitest';

import {
  findPlusEntitlement,
  getPlusEntitlementCandidates,
} from '../../supabase/functions/_shared/revenuecat-entitlements';

describe('RevenueCat entitlement matching', () => {
  it('prefers the configured entitlement id from the environment', () => {
    const result = findPlusEntitlement({
      'Apple Store Pro': {
        expires_date: '2026-05-04T07:00:00Z',
        product_identifier: 'plus',
      },
      plus: {
        expires_date: '2026-05-04T08:00:00Z',
        product_identifier: 'monthly',
      },
    }, 'Apple Store Pro');

    expect(result.entitlementId).toBe('Apple Store Pro');
    expect(result.entitlement?.product_identifier).toBe('plus');
  });

  it('falls back to the canonical plus entitlement id', () => {
    const result = findPlusEntitlement({
      plus: {
        expires_date: '2026-05-04T08:00:00Z',
        product_identifier: 'monthly',
      },
    });

    expect(result.entitlementId).toBe('plus');
    expect(result.entitlement?.product_identifier).toBe('monthly');
  });

  it('keeps compatibility with the generated legacy REST entitlement id', () => {
    const result = findPlusEntitlement({
      entlabef9aca35: {
        expires_date: '2026-05-04T08:00:00Z',
        product_identifier: 'monthly',
      },
    });

    expect(result.entitlementId).toBe('entlabef9aca35');
  });

  it('returns nulls when no known Plus entitlement exists', () => {
    expect(findPlusEntitlement({
      premium: {
        product_identifier: 'monthly',
      },
    })).toEqual({ entitlement: null, entitlementId: null });
  });

  it('deduplicates blank and repeated entitlement candidates', () => {
    expect(getPlusEntitlementCandidates(' plus ')).toEqual(['plus', 'entlabef9aca35']);
    expect(getPlusEntitlementCandidates('')).toEqual(['plus', 'entlabef9aca35']);
  });
});
