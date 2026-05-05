import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { modalStyles as ms } from '@/components/modal-styles';
import { PetPicker } from '@/components/pet-picker';
import { Button } from '@/components/ui';
import { manualStatusBg, manualStatusEmoji, manualStatusLabel, riskBannerStyle, riskIcon, riskTitle } from '@/lib/logs/log-utils';
import { cancelFollowUp, scheduleAbnormalFollowUp } from '@/lib/notifications';
import type { HistoryLog } from '@/hooks/use-poop-logs';
import type { Database } from '@/types/database';
import { Surface } from '@/constants/theme';

type Pet = Database['public']['Tables']['pets']['Row'];

type Props = {
  log: HistoryLog;
  onClose: () => void;
  variant?: 'default' | 'follow-up';
  showEntryModeRow?: boolean;
  showQuickModeTag?: boolean;
  pets?: Pet[];
  onAssignPet?: (petId: string) => void;
  isAssigningPet?: boolean;
};

export function LogDetailContent({
  log,
  onClose,
  variant = 'default',
  showEntryModeRow = false,
  showQuickModeTag = false,
  pets = [],
  onAssignPet,
  isAssigningPet = false,
}: Props) {
  const isFollowUp = variant === 'follow-up';

  return (
    <ScrollView style={ms.resultScroll} contentContainerStyle={ms.resultContent}>
      {log.entryMode === 'quick_log' ? (
        <View style={[styles.quickBanner, { backgroundColor: manualStatusBg(log.manualStatus) }]}>
          <Text style={styles.quickEmoji}>{manualStatusEmoji(log.manualStatus)}</Text>
          <Text style={styles.quickLabel}>{manualStatusLabel(log.manualStatus)}</Text>
          {showQuickModeTag ? <Text style={styles.quickModeTag}>快速記錄</Text> : null}
        </View>
      ) : log.imageUrl ? (
        <Image source={{ uri: log.imageUrl }} style={ms.resultImage} contentFit="cover" />
      ) : (
        <View style={[ms.resultImage, styles.imageFallback]}>
          <Ionicons name="image-outline" size={40} color="#bbc9c7" />
        </View>
      )}

      <View style={ms.resultBody}>
        {log.entryMode === 'photo_ai' && (
          <View style={[ms.riskBanner, riskBannerStyle(log.riskLevel)]}>
            <Text style={ms.riskBannerIcon}>{riskIcon(log.riskLevel)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[ms.riskBannerTitle, { color: riskBannerStyle(log.riskLevel).textColor }]}>
                {riskTitle(log.riskLevel)}
              </Text>
              {log.summary ? (
                <Text style={[ms.riskBannerSub, { color: riskBannerStyle(log.riskLevel).textColor }]}>
                  {log.summary}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {log.note ? (
          <View style={ms.recommendBox}>
            <Text style={ms.recommendLabel}>備註</Text>
            <Text style={ms.recommendText}>{log.note}</Text>
          </View>
        ) : null}

        {log.recommendation ? (
          <View style={ms.recommendBox}>
            <Text style={ms.recommendLabel}>建議</Text>
            <Text style={ms.recommendText}>{log.recommendation}</Text>
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
              <PetPicker
                pets={pets}
                variant="compact"
                disabled={isAssigningPet}
                onSelect={onAssignPet}
              />
            ) : isAssigningPet ? (
              <ActivityIndicator color="#20B2AA" />
            ) : null}
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>時間</Text>
          <Text style={styles.infoValue}>{new Date(log.capturedAt).toLocaleString('zh-TW')}</Text>
        </View>

        {showEntryModeRow ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>記錄方式</Text>
            <Text style={styles.infoValue}>{log.entryMode === 'quick_log' ? '快速記錄' : '拍照分析'}</Text>
          </View>
        ) : null}
      </View>

      {isFollowUp && log.riskLevel !== 'normal' ? (
        <View style={ms.modalActions}>
          <Text style={styles.followUpLabel}>今天恢復正常了嗎？</Text>
          <Button
            label="已恢復正常"
            onPress={() => { void cancelFollowUp(log.id); onClose(); }}
          />
          <Button
            label="仍在觀察中，明天再提醒"
            variant="ghost"
            onPress={() => { void scheduleAbnormalFollowUp(log.id); onClose(); }}
          />
        </View>
      ) : (
        <View style={ms.modalActions}>
          <Button label="關閉" onPress={onClose} />
        </View>
      )}
    </ScrollView>
  );
}

type ModalProps = Omit<Props, 'log'> & {
  log: HistoryLog | null;
};

export function LogDetailModal({ log, ...rest }: ModalProps) {
  return (
    <Modal visible={!!log} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={ms.modalSafe}>
        {log ? <LogDetailContent log={log} {...rest} /> : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  imageFallback: { alignItems: 'center', backgroundColor: Surface.bgMuted, justifyContent: 'center' },

  quickBanner: { alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 48 },
  quickEmoji: { fontSize: 56 },
  quickLabel: { color: Surface.inkSoft, fontSize: 22, fontWeight: '700' },
  quickModeTag: { color: Surface.muted, fontSize: 13 },

  infoRow: {
    alignItems: 'center', backgroundColor: Surface.bgSoft, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'space-between', padding: 14,
  },
  infoLabel: { color: Surface.muted, fontSize: 15 },
  infoValue: { color: Surface.ink, fontSize: 15, fontWeight: '700' },

  unclassifiedBox: { backgroundColor: Surface.bgSoft, borderRadius: 12, gap: 10, padding: 14 },
  unclassifiedLabel: {
    color: Surface.muted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  followUpLabel: {
    color: Surface.inkSoft,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
});
