import { StyleSheet, Text, View } from 'react-native';

import type { LogTone } from '@/lib/log-utils';

const TONE_COLORS: Record<LogTone, { bg: string; text: string }> = {
  danger:  { bg: '#fde8e8', text: '#9a3412' },
  neutral: { bg: '#e9efed', text: '#3c4948' },
  success: { bg: '#d8f3e8', text: '#166534' },
  warning: { bg: '#fef3c7', text: '#92400e' },
};

export function StatusPill({ label, tone }: { label: string; tone: LogTone }) {
  const { bg, text } = TONE_COLORS[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill:     { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: '700' },
});
