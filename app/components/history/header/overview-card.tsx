import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { StatusColors, Surface } from '@/constants/theme';
import type { RangeKey, RangeSummary, TrendSummaryLike } from '@/lib/logs/history-metrics';

export function OverviewCard({
  isLoading,
  rangeKey,
  rangeSummary,
  trendSummary,
}: {
  isLoading: boolean;
  rangeKey: RangeKey;
  rangeSummary: RangeSummary;
  trendSummary: TrendSummaryLike;
}) {
  const tone = trendSummary?.hasRecentAbnormal ? 'warning' : 'success';
  const rangeLabel = rangeKey === '7d' ? '近 7 天' : '近 30 天';

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={[styles.icon, tone === 'warning' ? styles.iconWarning : styles.iconSuccess]}>
          <Ionicons
            name={tone === 'warning' ? 'warning-outline' : 'checkmark-circle-outline'}
            size={22}
            color={tone === 'warning' ? '#92400e' : '#065f46'}
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>健康總覽</Text>
          <Text style={styles.title}>
            {trendSummary?.message ?? (isLoading ? '載入趨勢中' : '還沒有記錄，開始第一筆吧')}
          </Text>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <MetricTile label={`${rangeLabel}紀錄`} value={`${rangeSummary.totalCount}`} />
        <MetricTile label="正常率" value={rangeSummary.normalRate === null ? '--' : `${rangeSummary.normalRate}%`} />
        <MetricTile label="異常天數" value={`${rangeSummary.abnormalDays}`} />
        <MetricTile label="拍照筆數" value={`${rangeSummary.photoCount}`} />
      </View>
    </View>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Surface.bgSoft,
    borderColor: '#d9e7e5',
    borderRadius: 18,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  top: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  icon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconSuccess: { backgroundColor: StatusColors.normal.bg },
  iconWarning: { backgroundColor: StatusColors.observe.bg },
  copy: { flex: 1, gap: 3 },
  eyebrow: { color: Surface.muted, fontSize: 12, fontWeight: '700' },
  title: { color: Surface.ink, fontSize: 17, fontWeight: '800', lineHeight: 22 },
  metricGrid: { flexDirection: 'row', gap: 8 },
  metricTile: {
    flex: 1,
    gap: 3,
    minHeight: 64,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  metricValue: {
    color: Surface.ink,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    textAlign: 'center',
  },
  metricLabel: { color: Surface.muted, fontSize: 10, fontWeight: '700', textAlign: 'center' },
});
