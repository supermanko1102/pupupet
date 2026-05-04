import { afterEach, describe, expect, it, vi } from 'vitest';

import { BillingAccount, isActiveSubscription, remainingAnalysesFor } from '@/lib/billing';

const baseAccount: BillingAccount = {
  current_period_end: null,
  free_analysis_remaining: 4,
  monthly_analysis_limit: 60,
  monthly_analysis_used: 0,
  subscription_status: 'inactive',
  user_id: 'user-id',
};

function account(overrides: Partial<BillingAccount>): BillingAccount {
  return { ...baseAccount, ...overrides };
}

describe('billing helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('treats active subscriptions with a future period end as Plus', () => {
    vi.setSystemTime(new Date('2026-05-04T06:00:00Z'));

    expect(isActiveSubscription(account({
      current_period_end: '2026-05-04T07:00:00Z',
      subscription_status: 'active',
    }))).toBe(true);
  });

  it('treats billing issue and cancelled subscriptions as active until period end', () => {
    vi.setSystemTime(new Date('2026-05-04T06:00:00Z'));

    expect(isActiveSubscription(account({
      current_period_end: '2026-05-04T07:00:00Z',
      subscription_status: 'billing_issue',
    }))).toBe(true);
    expect(isActiveSubscription(account({
      current_period_end: '2026-05-04T07:00:00Z',
      subscription_status: 'cancelled',
    }))).toBe(true);
  });

  it('treats expired or missing subscription periods as inactive', () => {
    vi.setSystemTime(new Date('2026-05-04T06:00:00Z'));

    expect(isActiveSubscription(account({
      current_period_end: '2026-05-04T05:59:59Z',
      subscription_status: 'active',
    }))).toBe(false);
    expect(isActiveSubscription(account({
      current_period_end: null,
      subscription_status: 'active',
    }))).toBe(false);
  });

  it('uses subscription quota for active Plus accounts', () => {
    vi.setSystemTime(new Date('2026-05-04T06:00:00Z'));

    expect(remainingAnalysesFor(account({
      current_period_end: '2026-05-04T07:00:00Z',
      free_analysis_remaining: 4,
      monthly_analysis_limit: 60,
      monthly_analysis_used: 11,
      subscription_status: 'active',
    }))).toBe(49);
  });

  it('uses free quota for inactive accounts', () => {
    expect(remainingAnalysesFor(account({
      free_analysis_remaining: 3,
      subscription_status: 'inactive',
    }))).toBe(3);
  });

  it('does not return negative subscription quota', () => {
    vi.setSystemTime(new Date('2026-05-04T06:00:00Z'));

    expect(remainingAnalysesFor(account({
      current_period_end: '2026-05-04T07:00:00Z',
      monthly_analysis_limit: 60,
      monthly_analysis_used: 61,
      subscription_status: 'active',
    }))).toBe(0);
  });
});
