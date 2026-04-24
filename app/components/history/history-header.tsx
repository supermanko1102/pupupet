import { Ionicons } from '@expo/vector-icons';
import { BarChart, type stackDataItem } from 'react-native-gifted-charts';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { StatusColors } from '@/constants/theme';
import {
  formatDateKeyLabel,
  formatShortDate,
  RANGE_OPTIONS,
  type DayMetric,
  type RangeKey,
  type RangeSummary,
  type TrendSummaryLike,
} from '@/lib/history-metrics';
import { lightImpactFeedback, selectionFeedback } from '@/lib/haptics';
import type { RiskLevel } from '@/hooks/use-poop-logs';

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
  function handleClearDate() {
    lightImpactFeedback();
    onClearDate();
  }

  function handleFilterPress(nextValue: boolean) {
    if (nextValue !== abnormalOnly) selectionFeedback();
    onToggleAbnormalOnly(nextValue);
  }

  function handleRangePress(nextRange: RangeKey) {
    if (nextRange !== rangeKey) selectionFeedback();
    onRangeChange(nextRange);
  }

  return (
    <View style={styles.headerWrap}>
      <OverviewCard
        isLoading={isStatsLoading}
        rangeKey={rangeKey}
        rangeSummary={rangeSummary}
        trendSummary={trendSummary}
      />

      <View style={styles.rangeRow}>
        {RANGE_OPTIONS.map((option) => {
          const isSelected = option.key === rangeKey;
          return (
            <Pressable
              key={option.key}
              android_ripple={BUTTON_RIPPLE}
              style={({ pressed }) => [
                styles.rangeButton,
                isSelected && styles.rangeButtonSelected,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => handleRangePress(option.key)}>
              <Text style={[styles.rangeButtonText, isSelected && styles.rangeButtonTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <DailyBars days={rangeDays} />

      <RecordDaysStrip days={recordDays} selectedDate={selectedDate} onSelectDate={onSelectDate} />

      <View style={styles.recordsToolbar}>
        <View style={styles.recordsTitleBlock}>
          <Text style={styles.recordsTitle}>
            {selectedDate ? `${formatDateKeyLabel(selectedDate)}紀錄` : abnormalOnly ? '最近異常' : '最近紀錄'}
          </Text>
          <Text style={styles.recordsSubtitle}>
            {selectedDate ? '日期詳情' : '依時間排序'}
          </Text>
        </View>
        {selectedDate ? (
          <Pressable
            android_ripple={BUTTON_RIPPLE}
            style={({ pressed }) => [styles.clearDateButton, pressed && styles.buttonPressed]}
            onPress={handleClearDate}>
            <Ionicons name="close" size={16} color="#3c4948" />
            <Text style={styles.clearDateButtonText}>清除</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        <Pressable
          android_ripple={BUTTON_RIPPLE}
          style={({ pressed }) => [
            styles.filterButton,
            !abnormalOnly && styles.filterButtonSelected,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => handleFilterPress(false)}>
          <Text style={[styles.filterButtonText, !abnormalOnly && styles.filterButtonTextSelected]}>
            全部
          </Text>
        </Pressable>
        <Pressable
          android_ripple={BUTTON_RIPPLE}
          style={({ pressed }) => [
            styles.filterButton,
            abnormalOnly && styles.filterButtonSelected,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => handleFilterPress(true)}>
          <Text style={[styles.filterButtonText, abnormalOnly && styles.filterButtonTextSelected]}>
            只看異常
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function OverviewCard({
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
    <View style={styles.overviewCard}>
      <View style={styles.overviewTop}>
        <View style={[styles.overviewIcon, tone === 'warning' ? styles.overviewIconWarning : styles.overviewIconSuccess]}>
          <Ionicons
            name={tone === 'warning' ? 'warning-outline' : 'checkmark-circle-outline'}
            size={22}
            color={tone === 'warning' ? '#92400e' : '#065f46'}
          />
        </View>
        <View style={styles.overviewCopy}>
          <Text style={styles.overviewEyebrow}>健康總覽</Text>
          <Text style={styles.overviewTitle}>
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

function DailyBars({
  days,
}: {
  days: DayMetric[];
}) {
  const { width } = useWindowDimensions();
  const maxCount = Math.max(1, ...days.map((day) => day.count));
  const isCompact = days.length <= 7;
  const chartWidth = Math.max(260, width - 68);
  const barWidth = isCompact ? 18 : 12;
  const spacing = isCompact
    ? Math.max(12, Math.floor((chartWidth - (days.length * barWidth) - 24) / Math.max(1, days.length - 1)))
    : 10;
  const chartData: stackDataItem[] = days.map((day) => {
    const stacks = [
      { color: '#20B2AA', value: day.normalCount },
      { color: '#f59e0b', value: day.observeCount },
      { color: '#ef4444', value: day.vetCount },
    ].filter((stack) => stack.value > 0);

    return {
      barBorderRadius: 5,
      label: isCompact ? day.weekday : `${day.dayNumber}`,
      labelTextStyle: day.isToday ? styles.chartLabelToday : styles.chartLabel,
      stacks: stacks.length > 0
        ? stacks
        : [{ color: '#d9e2e0', value: 0 }],
    };
  });

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>每日趨勢</Text>
        <Text style={styles.panelMeta}>近 {days.length} 天</Text>
      </View>
      <View style={styles.chartWrap}>
        <BarChart
          key={isCompact ? 'daily-bars-compact' : 'daily-bars-scrollable'}
          adjustToWidth={isCompact}
          animationDuration={420}
          barWidth={barWidth}
          disablePress
          disableScroll={isCompact}
          endSpacing={12}
          frontColor="#20B2AA"
          height={132}
          hideRules
          initialSpacing={8}
          isAnimated
          labelWidth={24}
          labelsExtraHeight={4}
          maxValue={Math.max(3, maxCount)}
          noOfSections={3}
          parentWidth={chartWidth}
          roundedTop
          rulesColor="#edf3f2"
          scrollAnimation={false}
          scrollToEnd={!isCompact}
          showScrollIndicator={false}
          spacing={spacing}
          stackData={chartData}
          width={chartWidth}
          xAxisColor="#e3e9e8"
          xAxisLabelTextStyle={styles.chartLabel}
          xAxisThickness={1}
          yAxisColor="transparent"
          yAxisLabelWidth={22}
          yAxisTextStyle={styles.chartYAxisLabel}
          yAxisThickness={0}
        />
      </View>
      <View style={styles.chartLegend}>
        <LegendItem color="#20B2AA" label="正常" />
        <LegendItem color="#f59e0b" label="觀察" />
        <LegendItem color="#ef4444" label="就醫" />
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function RecordDaysStrip({
  days,
  onSelectDate,
  selectedDate,
}: {
  days: DayMetric[];
  onSelectDate: (dateKey: string) => void;
  selectedDate: string | null;
}) {
  function handleDayPress(dateKey: string) {
    if (dateKey !== selectedDate) selectionFeedback();
    onSelectDate(dateKey);
  }

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>本月紀錄</Text>
        <Text style={styles.panelMeta}>{days.length > 0 ? `本月 ${days.length} 天` : '本月 0 天'}</Text>
      </View>
      {days.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.abnormalChipRow}>
          {days.map((day) => {
            const isSelected = selectedDate === day.dateKey;

            return (
              <Pressable
                key={day.dateKey}
                android_ripple={BUTTON_RIPPLE}
                style={({ pressed }) => [
                  styles.abnormalChip,
                  { borderColor: riskAccentColor(day.riskLevel) },
                  isSelected && styles.abnormalChipSelected,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => handleDayPress(day.dateKey)}>
                <Ionicons
                  name={recordDayIcon(day.riskLevel)}
                  size={15}
                  color={riskTextColor(day.riskLevel)}
                />
                <Text style={[styles.abnormalChipDate, { color: riskTextColor(day.riskLevel) }]}>
                  {formatShortDate(day.dateKey)}
                </Text>
                <Text style={styles.abnormalChipCount}>{day.count} 筆</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.noAbnormalText}>目前本月還沒有任何紀錄。</Text>
      )}
    </View>
  );
}

function riskAccentColor(riskLevel: RiskLevel) {
  if (riskLevel === 'vet') return '#ef4444';
  if (riskLevel === 'observe') return '#f59e0b';
  if (riskLevel === 'normal') return '#20B2AA';
  return '#d9e2e0';
}

function riskTextColor(riskLevel: RiskLevel) {
  if (riskLevel === 'vet') return StatusColors.vet.text;
  if (riskLevel === 'observe') return StatusColors.observe.text;
  if (riskLevel === 'normal') return StatusColors.normal.text;
  return StatusColors.neutral.text;
}

function recordDayIcon(riskLevel: RiskLevel) {
  if (riskLevel === 'vet') return 'medical-outline';
  if (riskLevel === 'observe') return 'alert-circle-outline';
  if (riskLevel === 'normal') return 'checkmark-circle-outline';
  return 'ellipse-outline';
}

const BUTTON_RIPPLE = { color: 'rgba(23, 29, 28, 0.08)' };

const styles = StyleSheet.create({
  headerWrap: { gap: 14, paddingBottom: 6, paddingHorizontal: 20, paddingTop: 12 },
  overviewCard: {
    backgroundColor: '#f5fbf9',
    borderColor: '#d9e7e5',
    borderRadius: 18,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  overviewTop: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  overviewIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  overviewIconSuccess: { backgroundColor: StatusColors.normal.bg },
  overviewIconWarning: { backgroundColor: StatusColors.observe.bg },
  overviewCopy: { flex: 1, gap: 3 },
  overviewEyebrow: { color: '#6c7a78', fontSize: 12, fontWeight: '700' },
  overviewTitle: { color: '#171d1c', fontSize: 17, fontWeight: '800', lineHeight: 22 },
  metricGrid: { flexDirection: 'row', gap: 8 },
  metricTile: {
    flex: 1,
    gap: 3,
    minHeight: 64,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  metricValue: {
    color: '#171d1c',
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    textAlign: 'center',
  },
  metricLabel: { color: '#6c7a78', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  rangeRow: {
    backgroundColor: '#eef5f3',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  rangeButton: {
    alignItems: 'center',
    borderRadius: 9,
    flex: 1,
    height: 34,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rangeButtonSelected: { backgroundColor: '#ffffff' },
  rangeButtonText: { color: '#6c7a78', fontSize: 13, fontWeight: '700' },
  rangeButtonTextSelected: { color: '#171d1c' },
  panel: {
    backgroundColor: '#ffffff',
    borderColor: '#e3e9e8',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  panelHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  panelTitle: { color: '#171d1c', fontSize: 15, fontWeight: '800' },
  panelMeta: { color: '#6c7a78', fontSize: 12, fontWeight: '600' },
  chartWrap: { marginLeft: -8, minHeight: 176, overflow: 'hidden' },
  chartLabel: { color: '#6c7a78', fontSize: 10, fontWeight: '700' },
  chartLabelToday: { color: '#171d1c', fontSize: 10, fontWeight: '800' },
  chartYAxisLabel: { color: '#93a4a1', fontSize: 10, fontVariant: ['tabular-nums'] },
  chartLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 2 },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  legendDot: { borderRadius: 999, height: 9, width: 9 },
  legendText: { color: '#6c7a78', fontSize: 12, fontWeight: '600' },
  abnormalChipRow: { gap: 8, paddingRight: 2 },
  abnormalChip: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  abnormalChipSelected: { backgroundColor: '#f5fbf9', borderColor: '#171d1c' },
  abnormalChipDate: { fontSize: 13, fontWeight: '800' },
  abnormalChipCount: { color: '#6c7a78', fontSize: 12, fontWeight: '600' },
  noAbnormalText: { color: '#6c7a78', fontSize: 13, lineHeight: 19 },
  recordsToolbar: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  recordsTitleBlock: { flex: 1, gap: 3 },
  recordsTitle: { color: '#171d1c', fontSize: 18, fontWeight: '800' },
  recordsSubtitle: { color: '#6c7a78', fontSize: 12, fontWeight: '600' },
  clearDateButton: {
    alignItems: 'center',
    backgroundColor: '#e9efed',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  clearDateButtonText: { color: '#3c4948', fontSize: 12, fontWeight: '800' },
  filterRow: {
    backgroundColor: '#eef5f3',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  filterButton: {
    alignItems: 'center',
    borderRadius: 9,
    flex: 1,
    height: 34,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  filterButtonSelected: { backgroundColor: '#ffffff' },
  filterButtonText: { color: '#6c7a78', fontSize: 13, fontWeight: '700' },
  filterButtonTextSelected: { color: '#171d1c' },
  buttonPressed: { opacity: 0.72 },
});
