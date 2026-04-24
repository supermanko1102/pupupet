import { StyleSheet, Text, View } from 'react-native';

import { StatusColors } from '@/constants/theme';
import type { LogTone } from '@/lib/log-utils';

const TONE_COLORS: Record<LogTone, { bg: string; text: string }> = {
  danger:  { bg: StatusColors.vet.bg,     text: StatusColors.vet.text },
  neutral: { bg: StatusColors.neutral.bg, text: StatusColors.neutral.text },
  success: { bg: StatusColors.normal.bg,  text: StatusColors.normal.text },
  warning: { bg: StatusColors.observe.bg, text: StatusColors.observe.text },
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
