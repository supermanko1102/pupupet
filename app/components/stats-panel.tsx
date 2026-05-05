import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { poopLogsKeys, useStats } from '@/hooks/use-poop-logs';
import { buildRecentDays, type DayMetric } from '@/lib/logs/history-metrics';
import { useSession } from '@/providers/session-provider';
import { Brand, Surface } from '@/constants/theme';

function DayDot({ day }: { day: DayMetric }) {
  const color =
    day.riskLevel === 'normal' ? Brand.primary :
    day.riskLevel === 'observe' ? '#f59e0b' :
    day.riskLevel === 'vet' ? '#ef4444' : Surface.border;

  return (
    <View style={styles.dayItem}>
      <View style={[styles.dayDot, { backgroundColor: color }, day.isToday && styles.dayDotToday]} />
      <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>週{day.weekday}</Text>
    </View>
  );
}

function SummaryCard({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <View style={[styles.card, { borderTopColor: color }]}>
      <Text style={[styles.cardCount, { color }]}>{count}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

export function StatsPanel() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { data: statsData, isLoading, isRefetching, refetch } = useStats();

  const last7Days = useMemo(
    () => (statsData ? buildRecentDays(statsData.rows, 7) : []),
    [statsData]
  );

  function handleRefresh() {
    void queryClient.invalidateQueries({ queryKey: poopLogsKeys.stats(user?.id) });
    void refetch();
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#20B2AA" />
      </View>
    );
  }

  const healthRate = statsData && statsData.total > 0
    ? Math.round((statsData.normal / statsData.total) * 100)
    : null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#20B2AA" />
      }>

      <Text style={styles.pageTitle}>便便統計</Text>

      {/* 健康概覽 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>健康概覽</Text>
        <View style={styles.cardRow}>
          <SummaryCard count={statsData?.total ?? 0} label="總記錄" color="#20B2AA" />
          <SummaryCard count={statsData?.normal ?? 0} label="正常" color="#16a34a" />
          <SummaryCard count={statsData?.observe ?? 0} label="觀察" color="#f59e0b" />
          <SummaryCard count={statsData?.vet ?? 0} label="就醫" color="#ef4444" />
        </View>
        {healthRate !== null && (
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>健康率</Text>
            <Text style={styles.rateValue}>{healthRate}%</Text>
          </View>
        )}
      </View>

      {/* 過去 7 天 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>過去 7 天</Text>
        <View style={styles.weekRow}>
          {last7Days.map((day) => (
            <DayDot key={day.dateKey} day={day} />
          ))}
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Brand.primary }]} />
            <Text style={styles.legendText}>正常</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.legendText}>觀察</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>就醫</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Surface.border }]} />
            <Text style={styles.legendText}>無紀錄</Text>
          </View>
        </View>
      </View>

      {statsData?.total === 0 && (
        <Text style={styles.emptyHint}>開始拍照記錄，統計資料就會出現在這裡。</Text>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    color: Surface.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  section: {
    backgroundColor: Surface.bgSoft,
    borderColor: Surface.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
    padding: 20,
  },
  sectionTitle: {
    color: Surface.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Summary cards
  cardRow: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderTopWidth: 3,
    flex: 1,
    gap: 4,
    paddingVertical: 14,
  },
  cardCount: {
    fontSize: 24,
    fontWeight: '800',
  },
  cardLabel: {
    color: Surface.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  rateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rateLabel: {
    color: Surface.muted,
    fontSize: 14,
  },
  rateValue: {
    color: Brand.primary,
    fontSize: 20,
    fontWeight: '800',
  },

  // Week dots
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    alignItems: 'center',
    gap: 6,
  },
  dayDot: {
    borderRadius: 999,
    height: 28,
    width: 28,
  },
  dayDotToday: {
    borderColor: Surface.ink,
    borderWidth: 2,
  },
  dayLabel: {
    color: Surface.muted,
    fontSize: 11,
  },
  dayLabelToday: {
    color: Surface.ink,
    fontWeight: '700',
  },

  // Legend
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  legendDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  legendText: {
    color: Surface.muted,
    fontSize: 12,
  },

  emptyHint: {
    color: Surface.hairline,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
