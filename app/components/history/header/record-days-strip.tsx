import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Brand, StatusColors, Surface } from '@/constants/theme';
import { Card, Press, SectionHeader } from '@/components/ui';
import type { RiskLevel } from '@/hooks/use-poop-logs';
import { selectionFeedback } from '@/lib/haptics';
import { formatShortDate, type DayMetric } from '@/lib/logs/history-metrics';

export function RecordDaysStrip({
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
    <Card>
      <SectionHeader title="本月紀錄" meta={days.length > 0 ? `本月 ${days.length} 天` : '本月 0 天'} />
      {days.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {days.map((day) => {
            const isSelected = selectedDate === day.dateKey;

            return (
              <Press
                key={day.dateKey}
                style={[
                  styles.chip,
                  { borderColor: riskAccentColor(day.riskLevel) },
                  isSelected && styles.chipSelected,
                ]}
                onPress={() => handleDayPress(day.dateKey)}>
                <Ionicons
                  name={recordDayIcon(day.riskLevel)}
                  size={15}
                  color={riskTextColor(day.riskLevel)}
                />
                <Text style={[styles.chipDate, { color: riskTextColor(day.riskLevel) }]}>
                  {formatShortDate(day.dateKey)}
                </Text>
                <Text style={styles.chipCount}>{day.count} 筆</Text>
              </Press>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>目前本月還沒有任何紀錄。</Text>
      )}
    </Card>
  );
}

function riskAccentColor(riskLevel: RiskLevel) {
  if (riskLevel === 'vet') return '#ef4444';
  if (riskLevel === 'observe') return '#f59e0b';
  if (riskLevel === 'normal') return Brand.primary;
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

const styles = StyleSheet.create({
  chipRow: { gap: 8, paddingRight: 2 },
  chip: {
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
  chipSelected: { backgroundColor: Surface.bgSoft, borderColor: Surface.ink },
  chipDate: { fontSize: 13, fontWeight: '800' },
  chipCount: { color: Surface.muted, fontSize: 12, fontWeight: '600' },
  empty: { color: Surface.muted, fontSize: 13, lineHeight: 19 },
});
