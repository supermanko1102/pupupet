import { useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { effectiveRisk, poopLogsKeys, useStats } from '@/hooks/use-poop-logs';
import { useSession } from '@/providers/session-provider';
import type { Database } from '@/types/database';

type RiskLevel = Database['public']['Tables']['poop_logs']['Row']['risk_level'];
type LogRow = NonNullable<ReturnType<typeof useStats>['data']>['rows'][number];

type DayActivity = {
  date: string;       // 'YYYY-MM-DD'
  label: string;      // '週一' etc.
  riskLevel: RiskLevel | null;  // worst risk of the day, null = no log
};


const WEEK_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

function buildLast7Days(logs: LogRow[]): DayActivity[] {
  const days: DayActivity[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = WEEK_LABELS[d.getDay()];

    const dayLogs = logs.filter((l) => l.captured_at.slice(0, 10) === dateStr);
    let riskLevel: RiskLevel | null = null;
    if (dayLogs.some((l) => effectiveRisk(l) === 'vet')) riskLevel = 'vet';
    else if (dayLogs.some((l) => effectiveRisk(l) === 'observe')) riskLevel = 'observe';
    else if (dayLogs.some((l) => effectiveRisk(l) === 'normal')) riskLevel = 'normal';

    days.push({ date: dateStr, label, riskLevel });
  }
  return days;
}

function DayDot({ day }: { day: DayActivity }) {
  const isToday = day.date === new Date().toISOString().slice(0, 10);
  const color =
    day.riskLevel === 'normal' ? '#20B2AA' :
    day.riskLevel === 'observe' ? '#f59e0b' :
    day.riskLevel === 'vet' ? '#ef4444' : '#e3e9e8';

  return (
    <View style={styles.dayItem}>
      <View style={[styles.dayDot, { backgroundColor: color }, isToday && styles.dayDotToday]} />
      <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{day.label}</Text>
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

  const stats = statsData
    ? { ...statsData, last7Days: buildLast7Days(statsData.rows) }
    : null;

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

  const healthRate = stats && stats.total > 0
    ? Math.round((stats.normal / stats.total) * 100)
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
          <SummaryCard count={stats?.total ?? 0} label="總記錄" color="#20B2AA" />
          <SummaryCard count={stats?.normal ?? 0} label="正常" color="#16a34a" />
          <SummaryCard count={stats?.observe ?? 0} label="觀察" color="#f59e0b" />
          <SummaryCard count={stats?.vet ?? 0} label="就醫" color="#ef4444" />
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
          {stats?.last7Days.map((day) => (
            <DayDot key={day.date} day={day} />
          ))}
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#20B2AA' }]} />
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
            <View style={[styles.legendDot, { backgroundColor: '#e3e9e8' }]} />
            <Text style={styles.legendText}>無紀錄</Text>
          </View>
        </View>
      </View>

      {stats?.total === 0 && (
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
    color: '#171d1c',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  section: {
    backgroundColor: '#f5fbf9',
    borderColor: '#e3e9e8',
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
    padding: 20,
  },
  sectionTitle: {
    color: '#6c7a78',
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
    color: '#6c7a78',
    fontSize: 11,
    fontWeight: '600',
  },
  rateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rateLabel: {
    color: '#6c7a78',
    fontSize: 14,
  },
  rateValue: {
    color: '#20B2AA',
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
    borderColor: '#171d1c',
    borderWidth: 2,
  },
  dayLabel: {
    color: '#6c7a78',
    fontSize: 11,
  },
  dayLabelToday: {
    color: '#171d1c',
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
    color: '#6c7a78',
    fontSize: 12,
  },

  emptyHint: {
    color: '#bbc9c7',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
