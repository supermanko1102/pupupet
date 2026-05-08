import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { settingsRouteStyles as s } from '@/components/settings/route-shared';
import { useBilling } from '@/providers/billing-provider';
import { Brand, Surface } from '@/constants/theme';

function formatDate(value: string | null | undefined) {
  if (!value) return '尚未啟用';
  return new Date(value).toLocaleDateString('zh-TW', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const TERMS_URL = 'https://pupupet.vercel.app/terms';
const PRIVACY_URL = 'https://pupupet.vercel.app/privacy';

export default function PlusScreen() {
  const billing = useBilling();
  const account = billing.account;
  const refreshBilling = billing.refreshBilling;
  const isBusy = billing.isLoading || billing.isSyncing;
  const used = account?.monthly_analysis_used ?? 0;
  const limit = account?.monthly_analysis_limit ?? 60;
  const freeRemaining = account?.free_analysis_remaining ?? 0;

  useFocusEffect(
    useCallback(() => {
      void refreshBilling().catch((error) => {
        console.warn('Billing refresh failed:', error);
      });
    }, [refreshBilling])
  );

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="sparkles" size={26} color="#ffffff" />
          </View>
          <Text style={styles.heroTitle}>PupuPet Plus</Text>
          <Text style={styles.heroSub}>每月 60 次 AI 便便健康分析</Text>
        </View>

        <View style={s.section}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>目前方案</Text>
            <Text style={styles.metricValue}>{billing.isPlusActive ? 'Plus' : '免費方案'}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>剩餘分析</Text>
            <Text style={styles.metricValue}>{billing.remainingAnalyses} 次</Text>
          </View>
          {billing.isPlusActive ? (
            <>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>本期使用</Text>
                <Text style={styles.metricValue}>{used} / {limit}</Text>
              </View>
              <View style={[styles.metricRow, styles.metricRowLast]}>
                <Text style={styles.metricLabel}>重置日期</Text>
                <Text style={styles.metricValue}>{formatDate(account?.current_period_end)}</Text>
              </View>
            </>
          ) : (
            <View style={[styles.metricRow, styles.metricRowLast]}>
              <Text style={styles.metricLabel}>免費次數</Text>
              <Text style={styles.metricValue}>{freeRemaining} 次</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            disabled={isBusy}
            onPress={() => void (billing.isPlusActive ? billing.manageSubscription() : billing.purchasePlus())}>
            {isBusy ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="card-outline" size={18} color="#ffffff" />
                <Text style={styles.primaryButtonText}>{billing.isPlusActive ? '管理訂閱方案' : '訂閱 NT$120/月'}</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            disabled={isBusy}
            onPress={() => void billing.restorePurchases()}>
            <Ionicons name="refresh-outline" size={18} color="#20B2AA" />
            <Text style={styles.secondaryButtonText}>恢復購買</Text>
          </Pressable>
        </View>

        <View style={styles.disclosure}>
          <Text style={styles.disclosureTitle}>訂閱方案說明</Text>
          <Text style={styles.disclosureItem}>• 方案名稱：PupuPet Plus 月訂閱</Text>
          <Text style={styles.disclosureItem}>• 訂閱期間：1 個月（自動續訂）</Text>
          <Text style={styles.disclosureItem}>• 價格：NT$120 / 月</Text>
          <Text style={styles.disclosureItem}>
            • 訂閱會自動續訂，除非在當期到期前至少 24 小時關閉自動續訂。
          </Text>
          <Text style={styles.disclosureItem}>
            • 您的 Apple ID 帳戶將於當期結束前 24 小時內收取續訂費用。
          </Text>
          <Text style={styles.disclosureItem}>
            • 可隨時於 App Store 帳戶設定中管理或取消訂閱，取消會於當期結束時生效。
          </Text>
          <Text style={styles.disclosureItem}>
            • 取消訂閱後，到期日前仍可使用本期剩餘額度；到期後仍可查看歷史紀錄。
          </Text>
        </View>

        <View style={styles.legalLinks}>
          <Pressable
            onPress={() => void Linking.openURL(TERMS_URL)}
            hitSlop={8}>
            <Text style={styles.legalLink}>使用條款（EULA）</Text>
          </Pressable>
          <Text style={styles.legalDivider}>·</Text>
          <Pressable
            onPress={() => void Linking.openURL(PRIVACY_URL)}
            hitSlop={8}>
            <Text style={styles.legalLink}>隱私權政策</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10 },
  buttonPressed: { opacity: 0.72 },
  hero: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: Brand.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  heroSub: { color: Surface.muted, fontSize: 14, textAlign: 'center' },
  heroTitle: { color: Surface.ink, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  metricLabel: { color: Surface.muted, fontSize: 14 },
  metricRow: {
    alignItems: 'center',
    borderBottomColor: Surface.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  metricRowLast: { borderBottomWidth: 0 },
  metricValue: { color: Surface.ink, fontSize: 15, fontWeight: '700' },
  disclosure: {
    backgroundColor: Surface.bgSoft,
    borderRadius: 12,
    gap: 6,
    marginTop: 8,
    padding: 14,
  },
  disclosureTitle: {
    color: Surface.ink,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  disclosureItem: {
    color: Surface.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  legalLinks: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  legalLink: {
    color: Brand.primary,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  legalDivider: { color: Surface.muted, fontSize: 13 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Brand.primary,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: Surface.bgSoft,
    borderColor: '#d5e4e2',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: Brand.primary, fontSize: 15, fontWeight: '700' },
});
