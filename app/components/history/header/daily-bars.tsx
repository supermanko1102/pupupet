import { BarChart, type stackDataItem } from 'react-native-gifted-charts';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Brand, Surface } from '@/constants/theme';
import { Card, SectionHeader } from '@/components/ui';
import type { DayMetric } from '@/lib/logs/history-metrics';

export function DailyBars({ days }: { days: DayMetric[] }) {
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
      { color: Brand.primary, value: day.normalCount },
      { color: '#f59e0b', value: day.observeCount },
      { color: '#ef4444', value: day.vetCount },
    ].filter((stack) => stack.value > 0);

    return {
      barBorderRadius: 5,
      label: isCompact ? day.weekday : `${day.dayNumber}`,
      labelTextStyle: day.isToday ? styles.labelToday : styles.label,
      stacks: stacks.length > 0
        ? stacks
        : [{ color: '#d9e2e0', value: 0 }],
    };
  });

  return (
    <Card>
      <SectionHeader title="每日趨勢" meta={`近 ${days.length} 天`} />
      <View style={styles.chartWrap}>
        <BarChart
          key={isCompact ? 'daily-bars-compact' : 'daily-bars-scrollable'}
          adjustToWidth={isCompact}
          animationDuration={420}
          barWidth={barWidth}
          disablePress
          disableScroll={isCompact}
          endSpacing={12}
          frontColor={Brand.primary}
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
          rulesColor={Surface.divider}
          scrollAnimation={false}
          scrollToEnd={!isCompact}
          showScrollIndicator={false}
          spacing={spacing}
          stackData={chartData}
          width={chartWidth}
          xAxisColor={Surface.border}
          xAxisLabelTextStyle={styles.label}
          xAxisThickness={1}
          yAxisColor="transparent"
          yAxisLabelWidth={22}
          yAxisTextStyle={styles.yAxisLabel}
          yAxisThickness={0}
        />
      </View>
      <View style={styles.legend}>
        <LegendItem color={Brand.primary} label="正常" />
        <LegendItem color="#f59e0b" label="觀察" />
        <LegendItem color="#ef4444" label="就醫" />
      </View>
    </Card>
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

const styles = StyleSheet.create({
  chartWrap: { marginLeft: -8, minHeight: 176, overflow: 'hidden' },
  label: { color: Surface.muted, fontSize: 10, fontWeight: '700' },
  labelToday: { color: Surface.ink, fontSize: 10, fontWeight: '800' },
  yAxisLabel: { color: Surface.mutedSoft, fontSize: 10, fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 2 },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  legendDot: { borderRadius: 999, height: 9, width: 9 },
  legendText: { color: Surface.muted, fontSize: 12, fontWeight: '600' },
});
