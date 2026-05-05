import { StyleSheet, Text, View } from 'react-native';

import { Surface } from '@/constants/theme';
import { Press } from '@/components/ui';
import { selectionFeedback } from '@/lib/haptics';

export function FilterRow({
  abnormalOnly,
  onToggleAbnormalOnly,
}: {
  abnormalOnly: boolean;
  onToggleAbnormalOnly: (value: boolean) => void;
}) {
  function handleFilterPress(nextValue: boolean) {
    if (nextValue !== abnormalOnly) selectionFeedback();
    onToggleAbnormalOnly(nextValue);
  }

  return (
    <View style={styles.row}>
      <Press
        style={[styles.button, !abnormalOnly && styles.buttonSelected]}
        onPress={() => handleFilterPress(false)}>
        <Text style={[styles.text, !abnormalOnly && styles.textSelected]}>全部</Text>
      </Press>
      <Press
        style={[styles.button, abnormalOnly && styles.buttonSelected]}
        onPress={() => handleFilterPress(true)}>
        <Text style={[styles.text, abnormalOnly && styles.textSelected]}>只看異常</Text>
      </Press>
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
