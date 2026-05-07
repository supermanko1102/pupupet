import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import Purchases from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { BILLING_ACCOUNT_SELECT, BillingAccount, SyncBillingResponse, evaluateAnalysisAccess, isActiveSubscription, remainingAnalysesFor } from '@/lib/billing';
import { canUseRevenueCatPurchases, configurePurchasesForUser, logRevenueCatProductDiagnostics } from '@/lib/billing/revenuecat';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';

const BILLING_KEY = 'billing_account';

type BillingContextValue = {
  account: BillingAccount | null;
  canPurchase: boolean;
  ensureCanAnalyze: () => Promise<boolean>;
  isLoading: boolean;
  isPlusActive: boolean;
  isRevenueCatReady: boolean;
  isSyncing: boolean;
  refreshBilling: () => Promise<BillingAccount | null>;
  remainingAnalyses: number;
  restorePurchases: () => Promise<void>;
  showPaywall: () => Promise<boolean>;
};

const BillingContext = createContext<BillingContextValue>({
  account: null,
  canPurchase: false,
  ensureCanAnalyze: async () => false,
  isLoading: false,
  isPlusActive: false,
  isRevenueCatReady: false,
  isSyncing: false,
  refreshBilling: async () => null,
  remainingAnalyses: 0,
  restorePurchases: async () => {},
  showPaywall: async () => false,
});

async function fetchBillingAccount(userId: string) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('billing_accounts')
    .select(BILLING_ACCOUNT_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as BillingAccount | null;
}

export function BillingProvider({ children }: PropsWithChildren) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [isRevenueCatReady, setIsRevenueCatReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const canPurchase = canUseRevenueCatPurchases();

  const billingQuery = useQuery({
    queryKey: [BILLING_KEY, user?.id],
    queryFn: () => fetchBillingAccount(user!.id),
    enabled: !!user && !!supabase,
  });

  useEffect(() => {
    let isMounted = true;

    async function configureRevenueCat() {
      setIsRevenueCatReady(false);

      if (!user || !canPurchase) {
        return;
      }

      try {
        await configurePurchasesForUser(user.id);
        if (isMounted) setIsRevenueCatReady(true);
      } catch (error) {
        console.warn('RevenueCat configuration failed:', error);
        if (isMounted) setIsRevenueCatReady(false);
      }
    }

    void configureRevenueCat();

    return () => {
      isMounted = false;
    };
  }, [canPurchase, user]);

  const refreshBilling = useCallback(async () => {
    if (!supabase || !user) return null;

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke<SyncBillingResponse>('sync-billing', {
        body: {},
      });

      if (error) throw error;

      if (data?.account) {
        queryClient.setQueryData([BILLING_KEY, user.id], data.account);
        return data.account;
      }

      await queryClient.invalidateQueries({ queryKey: [BILLING_KEY, user.id] });
      return await fetchBillingAccount(user.id);
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient, user]);

  const showPaywall = useCallback(async () => {
    if (!canPurchase || !isRevenueCatReady) {
      Alert.alert('訂閱尚未設定', '目前僅支援 iOS 訂閱，且需要設定 RevenueCat API key。');
      return false;
    }

    await logRevenueCatProductDiagnostics();

    const result = await RevenueCatUI.presentPaywall({
      displayCloseButton: true,
    });

    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
      try {
        const account = await refreshBilling();
        return remainingAnalysesFor(account) > 0;
      } catch (error) {
        console.warn('RevenueCat purchase succeeded, but billing sync failed:', error);
        Alert.alert('訂閱已完成，狀態同步失敗', error instanceof Error ? error.message : '請稍後再試，或聯絡客服協助同步。');
        return false;
      }
    }

    return false;
  }, [canPurchase, isRevenueCatReady, refreshBilling]);

  const ensureCanAnalyze = useCallback(async () => {
    if (!user) return false;

    function notifyMonthlyExhausted() {
      Alert.alert('本月額度已用完', 'PupuPet Plus 每月包含 60 次 AI 分析，將於下一個訂閱週期重置。');
    }

    // 1) 先用最新的快取（fall back 到 query data 如果讀取失敗）
    let account = await fetchBillingAccount(user.id).catch(() => billingQuery.data ?? null);
    let access = evaluateAnalysisAccess(account);
    if (access.kind === 'ok') return true;
    if (access.kind === 'monthly_exhausted') {
      notifyMonthlyExhausted();
      return false;
    }

    // 2) 免費額度看似用完 — 強制 sync 一次（RevenueCat → DB），避免本地落後
    account = await refreshBilling().catch(() => account);
    access = evaluateAnalysisAccess(account);
    if (access.kind === 'ok') return true;
    if (access.kind === 'monthly_exhausted') {
      notifyMonthlyExhausted();
      return false;
    }

    // 3) 還是 free_exhausted → 引導付費
    if (await showPaywall()) return true;
    return false;
  }, [billingQuery.data, refreshBilling, showPaywall, user]);

  const restorePurchases = useCallback(async () => {
    if (!canPurchase || !isRevenueCatReady) {
      Alert.alert('訂閱尚未設定', '目前僅支援 iOS 訂閱，且需要設定 RevenueCat API key。');
      return;
    }

    setIsSyncing(true);
    try {
      await Purchases.restorePurchases();
      await refreshBilling();
      Alert.alert('已恢復購買', '訂閱狀態已同步。');
    } catch (error) {
      Alert.alert('恢復失敗', error instanceof Error ? error.message : '請稍後再試。');
    } finally {
      setIsSyncing(false);
    }
  }, [canPurchase, isRevenueCatReady, refreshBilling]);

  const value = useMemo<BillingContextValue>(() => ({
    account: billingQuery.data ?? null,
    canPurchase,
    ensureCanAnalyze,
    isLoading: billingQuery.isLoading,
    isPlusActive: isActiveSubscription(billingQuery.data ?? null),
    isRevenueCatReady,
    isSyncing,
    refreshBilling,
    remainingAnalyses: remainingAnalysesFor(billingQuery.data ?? null),
    restorePurchases,
    showPaywall,
  }), [
    billingQuery.data,
    billingQuery.isLoading,
    canPurchase,
    ensureCanAnalyze,
    isRevenueCatReady,
    isSyncing,
    refreshBilling,
    restorePurchases,
    showPaywall,
  ]);

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  return useContext(BillingContext);
}

export { BILLING_KEY };
