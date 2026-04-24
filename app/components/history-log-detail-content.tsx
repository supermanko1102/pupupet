import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  manualStatusBg,
  manualStatusEmoji,
  manualStatusLabel,
  riskBannerStyle,
  riskIcon,
  riskTitle,
} from '@/lib/log-utils';
import type { HistoryLog } from '@/hooks/use-poop-logs';
import type { Database } from '@/types/database';

type Pet = Database['public']['Tables']['pets']['Row'];

type Props = {
  isAssigningPet?: boolean;
  log: HistoryLog;
  onAssignPet?: (petId: string) => void;
  onClose: () => void;
  pets?: Pet[];
};

export function HistoryLogDetailContent({
  isAssigningPet = false,
  log,
  onAssignPet,
  onClose,
  pets = [],
}: Props) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      {log.entryMode === 'quick_log' ? (
        <View style={[styles.quickBanner, { backgroundColor: manualStatusBg(log.manualStatus) }]}>
          <Text style={styles.quickEmoji}>{manualStatusEmoji(log.manualStatus)}</Text>
          <Text style={styles.quickLabel}>{manualStatusLabel(log.manualStatus)}</Text>
          <Text style={styles.quickModeTag}>快速記錄</Text>
        </View>
      ) : log.imageUrl ? (
        <Image source={{ uri: log.imageUrl }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, styles.imageFallback]}>
          <Ionicons name="image-outline" size={40} color="#bbc9c7" />
        </View>
      )}

      <View style={styles.body}>
        {log.entryMode === 'photo_ai' && (
          <View style={[styles.riskBanner, riskBannerStyle(log.riskLevel)]}>
            <Text style={styles.riskBannerIcon}>{riskIcon(log.riskLevel)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.riskBannerTitle, { color: riskBannerStyle(log.riskLevel).textColor }]}>
                {riskTitle(log.riskLevel)}
              </Text>
              {log.summary ? (
                <Text style={[styles.riskBannerSub, { color: riskBannerStyle(log.riskLevel).textColor }]}>
                  {log.summary}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {log.note ? (
          <View style={styles.recommendBox}>
            <Text style={styles.recommendLabel}>備註</Text>
            <Text style={styles.recommendText}>{log.note}</Text>
          </View>
        ) : null}

        {log.recommendation ? (
          <View style={styles.recommendBox}>
            <Text style={styles.recommendLabel}>建議</Text>
            <Text style={styles.recommendText}>{log.recommendation}</Text>
          </View>
        ) : null}

        {log.petId ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>寵物</Text>
            <Text style={styles.infoValue}>{log.petName}</Text>
          </View>
        ) : (
          <View style={styles.unclassifiedBox}>
            <Text style={styles.unclassifiedLabel}>尚未分類</Text>
            {pets.length > 0 && onAssignPet ? (
              <View style={styles.petPickerRow}>
                {pets.map((pet) => (
                  <Pressable
                    key={pet.id}
                    style={styles.petPickerButton}
                    disabled={isAssigningPet}
                    onPress={() => onAssignPet(pet.id)}>
                    <Text style={styles.petPickerEmoji}>
                      {pet.species === 'dog' ? '🐶' : pet.species === 'cat' ? '🐱' : '🐾'}
                    </Text>
                    <Text style={styles.petPickerName}>{pet.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : isAssigningPet ? (
              <ActivityIndicator color="#20B2AA" />
            ) : null}
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>時間</Text>
          <Text style={styles.infoValue}>{new Date(log.capturedAt).toLocaleString('zh-TW')}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>關閉</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 8 },
  image: { height: 260, width: '100%' },
  imageFallback: { alignItems: 'center', backgroundColor: '#e9efed', justifyContent: 'center' },
  quickBanner: {
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 48,
  },
  quickEmoji: { fontSize: 56 },
  quickLabel: { color: '#3c4948', fontSize: 22, fontWeight: '700' },
  quickModeTag: { color: '#6c7a78', fontSize: 13 },
  body: { gap: 12, padding: 20 },
  actions: { gap: 12, padding: 24 },
  riskBanner: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  riskBannerIcon: { fontSize: 32 },
  riskBannerTitle: { fontSize: 18, fontWeight: '700' },
  riskBannerSub: { fontSize: 14, marginTop: 2, opacity: 0.8 },
  infoRow: {
    alignItems: 'center',
    backgroundColor: '#f5fbf9',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  infoLabel: { color: '#6c7a78', fontSize: 15 },
  infoValue: { color: '#171d1c', fontSize: 15, fontWeight: '700' },
  recommendBox: { backgroundColor: '#f5fbf9', borderRadius: 12, gap: 6, padding: 14 },
  recommendLabel: {
    color: '#6c7a78',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  recommendText: { color: '#3c4948', fontSize: 15, lineHeight: 22 },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#20B2AA',
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
  },
  closeButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  unclassifiedBox: { backgroundColor: '#f5fbf9', borderRadius: 12, gap: 10, padding: 14 },
  unclassifiedLabel: {
    color: '#6c7a78',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  petPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  petPickerButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e3e9e8',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  petPickerEmoji: { fontSize: 16 },
  petPickerName: { color: '#171d1c', fontSize: 14, fontWeight: '600' },
});
