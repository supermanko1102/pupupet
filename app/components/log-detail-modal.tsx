import { Image } from 'expo-image';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { modalStyles as ms } from '@/components/modal-styles';
import { manualStatusBg, manualStatusEmoji, manualStatusLabel, riskBannerStyle, riskIcon, riskTitle } from '@/lib/log-utils';
import { cancelFollowUp, scheduleAbnormalFollowUp } from '@/lib/notifications';
import type { Database } from '@/types/database';

type RiskLevel = Database['public']['Tables']['poop_logs']['Row']['risk_level'];
type ManualStatus = Database['public']['Tables']['poop_logs']['Row']['manual_status'];

export type DetailLog = {
  capturedAt: string;
  entryMode: 'quick_log' | 'photo_ai';
  id: string;
  imageUrl: string | null;
  manualStatus: ManualStatus;
  note: string | null;
  petName: string;
  riskLevel: RiskLevel;
  status: string;
  summary: string | null;
};

type Props = {
  log: DetailLog | null;
  isFollowUp?: boolean;
  onClose: () => void;
};

export function LogDetailModal({ log, isFollowUp = false, onClose }: Props) {
  return (
    <Modal visible={!!log} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={ms.modalSafe}>
        {log && (
          <ScrollView style={ms.resultScroll} contentContainerStyle={ms.resultContent}>
            {log.entryMode === 'quick_log' ? (
              <View style={[styles.quickBanner, { backgroundColor: manualStatusBg(log.manualStatus) }]}>
                <Text style={styles.quickEmoji}>{manualStatusEmoji(log.manualStatus)}</Text>
                <Text style={styles.quickLabel}>{manualStatusLabel(log.manualStatus)}</Text>
              </View>
            ) : log.imageUrl ? (
              <Image source={{ uri: log.imageUrl }} style={ms.resultImage} contentFit="cover" />
            ) : null}

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

              {log.note && (
                <View style={ms.recommendBox}>
                  <Text style={ms.recommendLabel}>備註</Text>
                  <Text style={ms.recommendText}>{log.note}</Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>寵物</Text>
                <Text style={styles.infoValue}>{log.petName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>時間</Text>
                <Text style={styles.infoValue}>{new Date(log.capturedAt).toLocaleString('zh-TW')}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>記錄方式</Text>
                <Text style={styles.infoValue}>{log.entryMode === 'quick_log' ? '快速記錄' : '拍照分析'}</Text>
              </View>
            </View>

            {isFollowUp && log.riskLevel !== 'normal' ? (
              <View style={ms.modalActions}>
                <Text style={styles.followUpLabel}>今天恢復正常了嗎？</Text>
                <Pressable
                  style={[ms.modalButton, ms.primaryButton]}
                  onPress={() => { void cancelFollowUp(log.id); onClose(); }}>
                  <Text style={ms.primaryButtonText}>已恢復正常</Text>
                </Pressable>
                <Pressable
                  style={[ms.modalButton, ms.ghostButton]}
                  onPress={() => { void scheduleAbnormalFollowUp(log.id); onClose(); }}>
                  <Text style={ms.ghostButtonText}>仍在觀察中，明天再提醒</Text>
                </Pressable>
              </View>
            ) : (
              <View style={ms.modalActions}>
                <Pressable style={[ms.modalButton, ms.primaryButton]} onPress={onClose}>
                  <Text style={ms.primaryButtonText}>關閉</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  quickBanner: { alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 48 },
  quickEmoji:  { fontSize: 56 },
  quickLabel:  { fontSize: 20, fontWeight: '700', color: '#3c4948' },

  infoRow: {
    alignItems: 'center', backgroundColor: '#f5fbf9', borderRadius: 12,
    flexDirection: 'row', justifyContent: 'space-between', padding: 14,
  },
  infoLabel: { color: '#6c7a78', fontSize: 15 },
  infoValue: { color: '#171d1c', fontSize: 15, fontWeight: '700' },

  followUpLabel: {
    color: '#3c4948',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
});
