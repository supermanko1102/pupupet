import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ripple, Surface } from '@/constants/theme';
import { lightImpactFeedback } from '@/lib/haptics';
import { formatDateKeyLabel } from '@/lib/logs/history-metrics';

export function RecordsToolbar({
  abnormalOnly,
  selectedDate,
  onClearDate,
}: {
  abnormalOnly: boolean;
  selectedDate: string | null;
  onClearDate: () => void;
}) {
  function handleClearDate() {
    lightImpactFeedback();
    onClearDate();
  }

  return (
    <View style={styles.toolbar}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>
          {selectedDate ? `${formatDateKeyLabel(selectedDate)}紀錄` : abnormalOnly ? '最近異常' : '最近紀錄'}
        </Text>
        <Text style={styles.subtitle}>
          {selectedDate ? '日期詳情' : '依時間排序'}
        </Text>
      </View>
      {selectedDate ? (
        <Pressable
          android_ripple={Ripple.onLight}
          style={({ pressed }) => [styles.clearButton, pressed && styles.clearButtonPressed]}
          onPress={handleClearDate}>
          <Ionicons name="close" size={16} color={Surface.inkSoft} />
          <Text style={styles.clearButtonText}>清除</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  titleBlock: { flex: 1, gap: 3 },
  title: { color: Surface.ink, fontSize: 18, fontWeight: '800' },
  subtitle: { color: Surface.muted, fontSize: 12, fontWeight: '600' },
  clearButton: {
    alignItems: 'center',
    backgroundColor: Surface.bgMuted,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  clearButtonPressed: { opacity: 0.72 },
  clearButtonText: { color: Surface.inkSoft, fontSize: 12, fontWeight: '800' },
});
