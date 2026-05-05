import { StyleSheet, Text, View } from 'react-native';

import { Surface } from '@/constants/theme';
import { Press } from '@/components/ui';
import { selectionFeedback } from '@/lib/haptics';
import { RANGE_OPTIONS, type RangeKey } from '@/lib/logs/history-metrics';

export function RangeRow({
  rangeKey,
  onRangeChange,
}: {
  rangeKey: RangeKey;
  onRangeChange: (range: RangeKey) => void;
}) {
  function handleRangePress(nextRange: RangeKey) {
    if (nextRange !== rangeKey) selectionFeedback();
    onRangeChange(nextRange);
  }

  return (
    <View style={styles.row}>
      {RANGE_OPTIONS.map((option) => {
        const isSelected = option.key === rangeKey;
        return (
          <Press
            key={option.key}
            style={[styles.button, isSelected && styles.buttonSelected]}
            onPress={() => handleRangePress(option.key)}>
            <Text style={[styles.text, isSelected && styles.textSelected]}>{option.label}</Text>
          </Press>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: Surface.bgSubtle,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  button: {
    alignItems: 'center',
    borderRadius: 9,
    flex: 1,
    height: 34,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonSelected: { backgroundColor: '#ffffff' },
  text: { color: Surface.muted, fontSize: 13, fontWeight: '700' },
  textSelected: { color: Surface.ink },
});
