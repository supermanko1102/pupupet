import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { modalStyles as ms } from '@/components/modal-styles';
import { UnlockFeedbackCard } from '@/components/unlock-feedback-card';
import type { RewardFeedback } from '@/lib/catalog';
import { toneBorderColor } from '@/lib/log-utils';
import type { Database } from '@/types/database';

type ManualStatus = Database['public']['Tables']['poop_logs']['Row']['manual_status'];

const QUICK_STATUS_OPTIONS: {
  value: NonNullable<ManualStatus>;
  label: string;
  emoji: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
}[] = [
  { value: 'normal',   label: '正常', emoji: '✅', tone: 'success' },
  { value: 'soft',     label: '偏軟', emoji: '🟡', tone: 'warning' },
  { value: 'hard',     label: '偏硬', emoji: '🟤', tone: 'warning' },
  { value: 'abnormal', label: '異常', emoji: '🚨', tone: 'danger' },
];

type Props = {
  visible: boolean;
  selectedStatus: NonNullable<ManualStatus> | null;
  quickNote: string;
  quickLogDone: boolean;
  rewardFeedback?: RewardFeedback | null;
  isPending: boolean;
  onSelectStatus: (status: NonNullable<ManualStatus>) => void;
  onChangeNote: (note: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function QuickLogModal({
  visible,
  selectedStatus,
  quickNote,
  quickLogDone,
  rewardFeedback,
  isPending,
  onSelectStatus,
  onChangeNote,
  onSubmit,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={ms.modalSafe}>
        {quickLogDone ? (
          <View style={styles.quickDoneContainer}>
            <Text style={styles.quickDoneEmoji}>
              {selectedStatus === 'normal' ? '✅' : selectedStatus === 'abnormal' ? '🚨' : '📝'}
            </Text>
            <Text style={styles.quickDoneTitle}>記錄完成</Text>
            {(selectedStatus === 'abnormal' || selectedStatus === 'soft') && (
              <View style={ms.trackingNotice}>
                <Ionicons name="notifications-outline" size={16} color="#92400e" />
                <Text style={ms.trackingNoticeText}>明天會提醒你追蹤狀況</Text>
              </View>
            )}
            {rewardFeedback ? <UnlockFeedbackCard feedback={rewardFeedback} /> : null}
            <Pressable
              style={[ms.modalButton, ms.primaryButton, { marginTop: 24, width: '80%' }]}
              onPress={onClose}>
              <Text style={ms.primaryButtonText}>好</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.quickLogContainer}>
            <Text style={styles.quickLogTitle}>今天狀況如何？</Text>
            <Text style={styles.quickLogSubtitle}>選一個最接近的描述</Text>

            <View style={styles.statusGrid}>
              {QUICK_STATUS_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.statusCard,
                    selectedStatus === opt.value && styles.statusCardSelected,
                    selectedStatus === opt.value && { borderColor: toneBorderColor(opt.tone) },
                  ]}
                  onPress={() => onSelectStatus(opt.value)}>
                  <Text style={styles.statusEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.statusLabel, selectedStatus === opt.value && { color: '#171d1c', fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.noteInputWrap}>
              <TextInput
                style={styles.noteInput}
                placeholder="補充備註（可略）"
                placeholderTextColor="#bbc9c7"
                value={quickNote}
                onChangeText={onChangeNote}
                maxLength={100}
              />
            </View>

            <View style={ms.modalActions}>
              <Pressable
                style={[ms.modalButton, ms.primaryButton, !selectedStatus && ms.buttonDisabled]}
                disabled={!selectedStatus || isPending}
                onPress={onSubmit}>
                {isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={ms.primaryButtonText}>記錄</Text>
                )}
              </Pressable>
              <Pressable style={[ms.modalButton, ms.ghostButton]} onPress={onClose}>
                <Text style={ms.ghostButtonText}>取消</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  quickLogContainer: { flex: 1, paddingTop: 32 },
  quickLogTitle: {
    color: '#171d1c', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 6,
  },
  quickLogSubtitle: { color: '#6c7a78', fontSize: 15, textAlign: 'center', marginBottom: 32 },
  statusGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', paddingHorizontal: 24,
  },
  statusCard: {
    alignItems: 'center', backgroundColor: '#f5fbf9', borderColor: '#e3e9e8',
    borderRadius: 16, borderWidth: 2, gap: 8, paddingVertical: 20, width: '44%',
  },
  statusCardSelected: { backgroundColor: '#f0fdf9' },
  statusEmoji:        { fontSize: 36 },
  statusLabel:        { color: '#6c7a78', fontSize: 16, fontWeight: '600' },
  noteInputWrap:      { marginHorizontal: 24, marginTop: 20 },
  noteInput: {
    backgroundColor: '#f5fbf9', borderColor: '#e3e9e8', borderRadius: 12,
    borderWidth: 1, color: '#171d1c', fontSize: 15, padding: 14,
  },
  quickDoneContainer: { alignItems: 'center', flex: 1, justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  quickDoneEmoji:     { fontSize: 64 },
  quickDoneTitle:     { color: '#171d1c', fontSize: 24, fontWeight: '700' },
});
