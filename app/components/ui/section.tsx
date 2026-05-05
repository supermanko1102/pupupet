import { StyleSheet, Text, View } from 'react-native';

import { Surface } from '@/constants/theme';

/**
 * Compact title + meta header used inside cards/panels.
 *   <SectionHeader title="每日趨勢" meta="近 30 天" />
 */
export function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: Surface.ink, fontSize: 15, fontWeight: '800' },
  meta: { color: Surface.muted, fontSize: 12, fontWeight: '600' },
});
