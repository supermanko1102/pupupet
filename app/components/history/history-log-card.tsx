import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/status-pill';
import {
  logStatusLabel,
  logStatusTone,
  toneBorderColor,
} from '@/lib/logs/log-utils';
import { formatLogDate } from '@/lib/logs/history-metrics';
import { lightImpactFeedback } from '@/lib/haptics';
import type { HistoryLog } from '@/hooks/use-poop-logs';
import { Surface } from '@/constants/theme';

export function HistoryLogCard({ log, onPress }: { log: HistoryLog; onPress: () => void }) {
  const tone = logStatusTone(log);

  function handlePress() {
    lightImpactFeedback();
    onPress();
  }

  return (
    <Pressable
      android_ripple={{ color: 'rgba(23, 29, 28, 0.08)' }}
      style={({ pressed }) => [
        styles.card,
        { borderColor: toneBorderColor(tone) },
        pressed && styles.cardPressed,
      ]}
      onPress={handlePress}>
      {log.imageUrl ? (
        <Image source={{ uri: log.imageUrl }} style={styles.cardImage} contentFit="cover" />
      ) : (
        <View style={[styles.cardImage, styles.cardImageFallback]}>
          <Ionicons name="image-outline" size={22} color="#bbc9c7" />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={styles.cardPetName} numberOfLines={1}>{log.petName}</Text>
          <StatusPill label={logStatusLabel(log)} tone={tone} />
        </View>
        <View style={styles.cardMetaRow}>
          <Ionicons name="camera-outline" size={13} color="#6c7a78" />
          <Text style={styles.cardDate}>
            {formatLogDate(log.capturedAt)}
          </Text>
        </View>
        {log.note ? (
          <Text style={styles.cardSummary} numberOfLines={1}>{log.note}</Text>
        ) : log.summary ? (
          <Text style={styles.cardSummary} numberOfLines={2}>{log.summary}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    marginHorizontal: 20,
    overflow: 'hidden',
    padding: 12,
  },
  cardPressed: { opacity: 0.75 },
  cardImage: { borderRadius: 12, height: 74, width: 74 },
  cardImageFallback: { alignItems: 'center', backgroundColor: Surface.bgMuted, justifyContent: 'center' },
  cardBody: { flex: 1, gap: 5, justifyContent: 'center', minWidth: 0 },
  cardRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  cardPetName: { color: Surface.ink, flex: 1, fontSize: 15, fontWeight: '700' },
  cardMetaRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  cardDate: { color: Surface.muted, fontSize: 12, fontWeight: '600' },
  cardSummary: { color: Surface.inkSoft, fontSize: 13, lineHeight: 18, marginTop: 1 },
});
