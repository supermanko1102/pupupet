import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Surface } from '@/constants/theme';
import type { DayMetric, RangeKey, RangeSummary, TrendSummaryLike } from '@/lib/logs/history-metrics';

import { DailyBars } from './daily-bars';
import { FilterRow } from './filter-row';
import { OverviewCard } from './overview-card';
import { RangeRow } from './range-row';
import { RecordDaysStrip } from './record-days-strip';
import { RecordsToolbar } from './records-toolbar';

export function HistoryHeader({
  isStatsLoading,
  onClearDate,
  onRangeChange,
  onSelectDate,
  onToggleWatchOnly,
  rangeDays,
  rangeKey,
  recordDays,
  rangeSummary,
  selectedDate,
  trendSummary,
  watchOnly,
}: {
  isStatsLoading: boolean;
  onClearDate: () => void;
  onRangeChange: (range: RangeKey) => void;
  onSelectDate: (dateKey: string) => void;
  onToggleWatchOnly: (value: boolean) => void;
  rangeDays: DayMetric[];
  rangeKey: RangeKey;
  recordDays: DayMetric[];
  rangeSummary: RangeSummary;
  selectedDate: string | null;
  trendSummary: TrendSummaryLike;
  watchOnly: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <OverviewCard
        isLoading={isStatsLoading}
        rangeKey={rangeKey}
        rangeSummary={rangeSummary}
        trendSummary={trendSummary}
      />
      <RangeRow rangeKey={rangeKey} onRangeChange={onRangeChange} />
      <DailyBars days={rangeDays} />
      <RecordDaysStrip days={recordDays} selectedDate={selectedDate} onSelectDate={onSelectDate} />
      <RecordsToolbar
        selectedDate={selectedDate}
        onClearDate={onClearDate}
        watchOnly={watchOnly}
      />
      <FilterRow watchOnly={watchOnly} onToggleWatchOnly={onToggleWatchOnly} />
      <View style={styles.swipeHint}>
        <Ionicons name="chevron-back-outline" size={14} color={Surface.mutedSoft} />
        <Text style={styles.swipeHintText}>左滑完成或失敗的紀錄可刪除</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeHint: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    marginTop: -2,
  },
  swipeHintText: { color: Surface.mutedSoft, fontSize: 12, fontWeight: '600' },
  wrap: { gap: 14, paddingBottom: 6, paddingHorizontal: 20, paddingTop: 12 },
});
