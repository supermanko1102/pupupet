import { StyleSheet, View } from 'react-native';

import type { DayMetric, RangeKey, RangeSummary, TrendSummaryLike } from '@/lib/logs/history-metrics';

import { DailyBars } from './daily-bars';
import { FilterRow } from './filter-row';
import { OverviewCard } from './overview-card';
import { RangeRow } from './range-row';
import { RecordDaysStrip } from './record-days-strip';
import { RecordsToolbar } from './records-toolbar';

export function HistoryHeader({
  abnormalOnly,
  isStatsLoading,
  onClearDate,
  onRangeChange,
  onSelectDate,
  onToggleAbnormalOnly,
  rangeDays,
  rangeKey,
  recordDays,
  rangeSummary,
  selectedDate,
  trendSummary,
}: {
  abnormalOnly: boolean;
  isStatsLoading: boolean;
  onClearDate: () => void;
  onRangeChange: (range: RangeKey) => void;
  onSelectDate: (dateKey: string) => void;
  onToggleAbnormalOnly: (value: boolean) => void;
  rangeDays: DayMetric[];
  rangeKey: RangeKey;
  recordDays: DayMetric[];
  rangeSummary: RangeSummary;
  selectedDate: string | null;
  trendSummary: TrendSummaryLike;
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
        abnormalOnly={abnormalOnly}
        selectedDate={selectedDate}
        onClearDate={onClearDate}
      />
      <FilterRow abnormalOnly={abnormalOnly} onToggleAbnormalOnly={onToggleAbnormalOnly} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14, paddingBottom: 6, paddingHorizontal: 20, paddingTop: 12 },
});
