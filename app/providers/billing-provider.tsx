import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';

const PLUS_ENTITLEMENT_ID = 'plus';
const BILLING_KEY = 'billing_account';

type BillingAccount = {
  current_period_end: string | null;
  free_analysis_remaining: number;
  monthly_analysis_limit: number;
  monthly_analysis_used: number;
  subscription_status: string;
  user_id: string;
};

type SyncBillingResponse = {
  account: BillingAccount;
};

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

function isActiveSubscription(account: BillingAccount | null) {
  if (!account?.current_period_end) return false;
  return (
    ['active', 'billing_issue', 'cancelled'].includes(account.subscription_status)
    && new Date(account.current_period_end).getTime() > Date.now()
  );
}

function remainingFor(account: BillingAccount | null) {
  if (!account) return 0;
  if (isActiveSubscription(account)) {
    return Math.max(account.monthly_analysis_limit - account.monthly_analysis_used, 0);
  }
  return account.free_analysis_remaining;
}

async function fetchBillingAccount(userId: string) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('billing_accounts')
    .select('user_id, subscription_status, current_period_end, monthly_analysis_limit, monthly_analysis_used, free_analysis_remaining')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as BillingAccount | null;
}

export function BillingProvider({ children }: PropsWithChildren) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const configuredUserIdRef = useRef<string | null>(null);
  const [isRevenueCatReady, setIsRevenueCatReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const canPurchase = Platform.OS === 'ios' && !!env.revenueCatIosApiKey;

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
        await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.WARN);

        const isConfigured = await Purchases.isConfigured().catch(() => false);
        if (!isConfigured) {
          Purchases.configure({
            apiKey: env.revenueCatIosApiKey,
            appUserID: user.id,
          });
        } else if (configuredUserIdRef.current !== user.id) {
          await Purchases.logIn(user.id);
        }

        configuredUserIdRef.current = user.id;
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

    const result = await RevenueCatUI.presentPaywall({
      displayCloseButton: true,
    });

    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
      const account = await refreshBilling();
      return remainingFor(account) > 0;
    }

    return false;
  }, [canPurchase, isRevenueCatReady, refreshBilling]);

  const ensureCanAnalyze = useCallback(async () => {
    if (!user) return false;

    let freshAccount = await fetchBillingAccount(user.id).catch(() => billingQuery.data ?? null);
    if (remainingFor(freshAccount) > 0) {
      return true;
    }

    if (isActiveSubscription(freshAccount)) {
      Alert.alert('本月額度已用完', 'PupuPet Plus 每月包含 60 次 AI 分析，將於下一個訂閱週期重置。');
      return false;
    }

    freshAccount = await refreshBilling().catch(() => freshAccount);
    if (remainingFor(freshAccount) > 0) {
      return true;
    }

    if (isActiveSubscription(freshAccount)) {
      Alert.alert('本月額度已用完', 'PupuPet Plus 每月包含 60 次 AI 分析，將於下一個訂閱週期重置。');
      return false;
    }

    const purchased = await showPaywall();
    if (purchased) {
      return true;
    }

    Alert.alert('需要 PupuPet Plus', '免費分析次數已用完，訂閱後即可繼續使用 AI 分析。');
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
    remainingAnalyses: remainingFor(billingQuery.data ?? null),
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

export { BILLING_KEY, PLUS_ENTITLEMENT_ID };
