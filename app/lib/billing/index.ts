export const BILLING_ACCOUNT_SELECT = 'user_id, subscription_status, current_period_end, monthly_analysis_limit, monthly_analysis_used, free_analysis_remaining';

export type BillingAccount = {
  current_period_end: string | null;
  free_analysis_remaining: number;
  monthly_analysis_limit: number;
  monthly_analysis_used: number;
  subscription_status: string;
  user_id: string;
};

export type SyncBillingResponse = {
  account: BillingAccount;
};

export function isActiveSubscription(account: BillingAccount | null) {
  if (!account?.current_period_end) return false;
  return (
    ['active', 'billing_issue', 'cancelled'].includes(account.subscription_status)
    && new Date(account.current_period_end).getTime() > Date.now()
  );
}

export function remainingAnalysesFor(account: BillingAccount | null) {
  if (!account) return 0;
  if (isActiveSubscription(account)) {
    return Math.max(account.monthly_analysis_limit - account.monthly_analysis_used, 0);
  }
  return account.free_analysis_remaining;
}

type AnalysisAccess =
  | { kind: 'ok' }
  | { kind: 'monthly_exhausted' }    // 訂閱者本月用完
  | { kind: 'free_exhausted' };      // 免費額度用完，需要訂閱

export function evaluateAnalysisAccess(account: BillingAccount | null): AnalysisAccess {
  if (remainingAnalysesFor(account) > 0) return { kind: 'ok' };
  if (isActiveSubscription(account)) return { kind: 'monthly_exhausted' };
  return { kind: 'free_exhausted' };
}
